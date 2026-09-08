/**
 * DOC 7B §1 — Editor store (Zustand + Immer).
 *
 * Single source of truth for the design studio: the schema being edited, the
 * selection, canvas view flags, the undo/redo stacks (schema snapshots, capped),
 * preview state (record cycling for data bindings) and dirty/save tracking.
 *
 * History discipline: discrete mutations (add/delete/duplicate/typography/
 * geometry-commit) snapshot the schema BEFORE mutating. Continuous pointer
 * interactions call `setGeometry` with `history:false` and the caller pushes a
 * single history entry when the gesture ends, so a drag does not flood the
 * undo stack.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { api } from '../lib/api';
import { cloneSchema, createDefaultElement, starterSchema } from './element-factory';
import type { ElementType, StudioElement, StudioRecord, StudioSaveResponse, StudioSchema } from './types';

interface EditorState {
  // Core
  appId: string | null;
  productName: string;
  schema: StudioSchema | null;
  isLoading: boolean;
  loadError: string | null;

  // Selection / hover
  selectedIds: string[];
  hoveredId: string | null;

  // History
  past: StudioSchema[];
  future: StudioSchema[];
  isUndoing: boolean;

  // Save
  dirty: boolean;
  saving: boolean;
  savedStudioVersion: number;
  designVersion: number;
  saveError: string | null;

  // Preview + data bindings
  previewMode: boolean;
  records: StudioRecord[];
  previewIndex: number;

  // Actions
  load: (appId: string, productName: string) => Promise<void>;
  newDraft: (productName: string) => void;
  select: (id: string, additive?: boolean) => void;
  clearSelection: () => void;
  setHovered: (id: string | null) => void;
  setPreviewMode: (on: boolean) => void;
  setRecords: (records: StudioRecord[]) => void;
  cycleRecord: (dir?: 1 | -1) => void;

  addElement: (type: ElementType) => void;
  duplicateSelected: () => void;
  deleteSelected: () => void;
  updateElement: (id: string, patch: Partial<StudioElement>, history?: boolean) => void;
  /** Continuous geometry updates during a drag/resize gesture. */
  setGeometry: (id: string, geometry: { x?: number; y?: number; width?: number; height?: number }, history?: boolean) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;

  updateSchemaName: (name: string) => void;
  updateCanvas: (patch: { width?: number; height?: number; background?: string }) => void;

  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  save: () => Promise<boolean>;
}

const HISTORY_CAP = 60;

function schemaOf(get: () => EditorState): StudioSchema | null {
  return get().schema;
}

export const useEditorStore = create<EditorState>()(
  immer((set, get) => ({
    appId: null,
    productName: '',
    schema: null,
    isLoading: false,
    loadError: null,
    selectedIds: [],
    hoveredId: null,
    past: [],
    future: [],
    isUndoing: false,
    dirty: false,
    saving: false,
    savedStudioVersion: 0,
    designVersion: 0,
    saveError: null,
    previewMode: false,
    records: [],
    previewIndex: 0,

    load: async (appId, productName) => {
      const prevApp = get().appId;
      if (prevApp !== appId) set({ schema: null, past: [], future: [], selectedIds: [] });
      set({ appId, productName, isLoading: true, loadError: null, previewMode: false });
      try {
        const res = await api.get<StudioSaveResponse>(`/v1/dashboard/apps/${appId}/design/schema`);
        set((s) => {
          if (res.schema) {
            s.schema = cloneSchema(res.schema);
            s.savedStudioVersion = res.studioVersion;
          } else {
            // No saved schema yet: give the studio the starter draft. It is a
            // brand-new draft — mark dirty so the first Save is obvious.
            s.schema = starterSchema(productName);
            s.savedStudioVersion = 0;
            s.dirty = true;
          }
          s.designVersion = res.designVersion;
          s.isLoading = false;
          s.selectedIds = [];
        });
      } catch (err) {
        set((s) => {
          s.isLoading = false;
          s.loadError = err instanceof Error ? err.message : 'Could not load this design.';
        });
      }
    },

    newDraft: (productName) =>
      set((s) => {
        if (s.schema && !s.isUndoing) {
          s.past.push(cloneSchema(s.schema));
          s.past = s.past.slice(-HISTORY_CAP);
          s.future = [];
        }
        s.schema = starterSchema(productName);
        s.dirty = true;
        s.selectedIds = [];
        s.previewIndex = 0;
      }),

    select: (id, additive = false) =>
      set((s) => {
        if (s.previewMode) return;
        if (additive) {
          const i = s.selectedIds.indexOf(id);
          if (i >= 0) s.selectedIds.splice(i, 1);
          else s.selectedIds.push(id);
        } else {
          s.selectedIds = [id];
        }
      }),
    clearSelection: () => set((s) => void (s.selectedIds = [])),
    setHovered: (id) => set({ hoveredId: id }),

    setPreviewMode: (on) => set({ previewMode: on }),
    setRecords: (records) => set({ records, previewIndex: 0 }),
    cycleRecord: (dir = 1) =>
      set((s) => {
        if (s.records.length === 0) return;
        s.previewIndex = (s.previewIndex + dir + s.records.length) % s.records.length;
      }),

    addElement: (type) =>
      set((s) => {
        const schema = s.schema;
        if (!schema) return;
        if (!s.isUndoing) {
          s.past.push(cloneSchema(schema));
          s.past = s.past.slice(-HISTORY_CAP);
          s.future = [];
        }
        const maxZ = schema.elements.reduce((m, e) => Math.max(m, e.layout.z), 0) + 1;
        const el = createDefaultElement(type, 120, 120, maxZ);
        schema.elements.push(el);
        s.selectedIds = [el.id];
        s.dirty = true;
        schema.version += 1;
      }),

    duplicateSelected: () =>
      set((s) => {
        const schema = s.schema;
        if (!schema || s.selectedIds.length === 0) return;
        if (!s.isUndoing) {
          s.past.push(cloneSchema(schema));
          s.past = s.past.slice(-HISTORY_CAP);
          s.future = [];
        }
        const maxZ = schema.elements.reduce((m, e) => Math.max(m, e.layout.z), 0) + 1;
        const created: string[] = [];
        for (const src of schema.elements.filter((e) => s.selectedIds.includes(e.id))) {
          const copy: StudioElement = { ...cloneSchema(src), id: `el_dup_${Math.random().toString(36).slice(2, 9)}` };
          copy.name = `${src.name} copy`;
          copy.layout.x += 16;
          copy.layout.y += 16;
          copy.layout.z = maxZ;
          schema.elements.push(copy);
          created.push(copy.id);
        }
        s.selectedIds = created;
        s.dirty = true;
        schema.version += 1;
      }),

    deleteSelected: () =>
      set((s) => {
        const schema = s.schema;
        if (!schema || s.selectedIds.length === 0) return;
        if (!s.isUndoing) {
          s.past.push(cloneSchema(schema));
          s.past = s.past.slice(-HISTORY_CAP);
          s.future = [];
        }
        const doomed = new Set(s.selectedIds);
        schema.elements = schema.elements.filter((e) => !doomed.has(e.id));
        s.selectedIds = [];
        s.dirty = true;
        schema.version += 1;
      }),

    updateElement: (id, patch, history = true) =>
      set((s) => {
        const schema = s.schema;
        const el = schema?.elements.find((e) => e.id === id);
        if (!schema || !el) return;
        if (history && !s.isUndoing) {
          s.past.push(cloneSchema(schema));
          s.past = s.past.slice(-HISTORY_CAP);
          s.future = [];
        }
        Object.assign(el, cloneSchema(patch));
        if (history) {
          s.dirty = true;
          schema.version += 1;
        }
      }),

    setGeometry: (id, geometry, history = false) =>
      set((s) => {
        const schema = s.schema;
        const el = schema?.elements.find((e) => e.id === id);
        if (!schema || !el) return;
        if (history && !s.isUndoing) {
          s.past.push(cloneSchema(schema));
          s.past = s.past.slice(-HISTORY_CAP);
          s.future = [];
        }
        if (geometry.x !== undefined) el.layout.x = geometry.x;
        if (geometry.y !== undefined) el.layout.y = geometry.y;
        if (geometry.width !== undefined) el.layout.width = geometry.width;
        if (geometry.height !== undefined) el.layout.height = geometry.height;
        // Gesture ticks never flood the history stack but still dirty the draft.
        s.dirty = true;
        if (history) schema.version += 1;
      }),

    bringToFront: (id) =>
      set((s) => {
        const schema = s.schema;
        const el = schema?.elements.find((e) => e.id === id);
        if (!schema || !el) return;
        if (!s.isUndoing) {
          s.past.push(cloneSchema(schema));
          s.past = s.past.slice(-HISTORY_CAP);
          s.future = [];
        }
        el.layout.z = schema.elements.reduce((m, e) => Math.max(m, e.layout.z), 0) + 1;
        s.dirty = true;
        schema.version += 1;
      }),
    sendToBack: (id) =>
      set((s) => {
        const schema = s.schema;
        const el = schema?.elements.find((e) => e.id === id);
        if (!schema || !el) return;
        if (!s.isUndoing) {
          s.past.push(cloneSchema(schema));
          s.past = s.past.slice(-HISTORY_CAP);
          s.future = [];
        }
        el.layout.z = Math.min(0, schema.elements.reduce((m, e) => Math.min(m, e.layout.z), 0) - 1);
        s.dirty = true;
        schema.version += 1;
      }),

    updateSchemaName: (name) =>
      set((s) => {
        if (!s.schema) return;
        s.schema.name = name;
        s.dirty = true;
      }),
    updateCanvas: (patch) =>
      set((s) => {
        if (!s.schema) return;
        if (patch.width) s.schema.canvas.width = Math.max(320, Math.min(1400, patch.width));
        if (patch.height) s.schema.canvas.height = Math.max(240, Math.min(2000, patch.height));
        if (patch.background !== undefined) s.schema.canvas.background = patch.background;
        s.dirty = true;
      }),

    pushHistory: () => {
      const schema = schemaOf(get);
      if (!schema) return;
      set((s) => {
        s.past.push(cloneSchema(schema));
        s.past = s.past.slice(-HISTORY_CAP);
        s.future = [];
      });
    },

    undo: () => {
      const { past } = get();
      if (past.length === 0) return;
      set((s) => {
        const prev = s.past.pop();
        if (!prev) return;
        s.isUndoing = true;
        s.future.push(cloneSchema(s.schema!));
        s.schema = prev;
        s.selectedIds = [];
        s.dirty = true;
        s.isUndoing = false;
      });
    },

    redo: () => {
      const { future } = get();
      if (future.length === 0) return;
      set((s) => {
        const next = s.future.pop();
        if (!next) return;
        s.isUndoing = true;
        if (s.schema) {
          s.past.push(cloneSchema(s.schema));
          s.past = s.past.slice(-HISTORY_CAP);
        }
        s.schema = next;
        s.selectedIds = [];
        s.dirty = true;
        s.isUndoing = false;
      });
    },

    save: async () => {
      const { schema, appId } = get();
      if (!schema || !appId) return false;
      set({ saving: true, saveError: null });
      try {
        const res = await api.patch<StudioSaveResponse>(`/v1/dashboard/apps/${appId}/design/schema`, {
          schema: { ...cloneSchema(schema), version: schema.version },
        });
        set((s) => {
          s.schema = cloneSchema(res.schema ?? schema);
          s.saving = false;
          s.dirty = false;
          s.savedStudioVersion = res.studioVersion;
          s.designVersion = res.designVersion;
        });
        return true;
      } catch (err) {
        set({ saving: false, saveError: err instanceof Error ? err.message : 'Could not save the design.' });
        return false;
      }
    },
  })),
);
