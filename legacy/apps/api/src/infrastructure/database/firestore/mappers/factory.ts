// Schema-driven Firestore mapper factory.
// Each per-entity mapper file (./<entity>.mapper.ts) is a short declarative
// map of domain-field → Firestore-field. This keeps the Doc-1 promise of
// "one mapper per entity" while making type/column drift impossible to hide.
import { Timestamp } from 'firebase-admin/firestore';
import type { FirestoreMapper } from '../firestore-base.repository';

type Kind =
  | 'string'
  | 'stringOrNull'
  | 'stringArray'
  | 'stringArrayOrNull'
  | 'number'
  | 'numberOrNull'
  | 'boolean'
  | 'date'
  | 'dateOrNull'
  | 'stringMap' // Record<string, string>
  | 'record' // Record<string, unknown>
  | 'recordOrNull' // Record<string, unknown> | null
  | 'recordNumber' // Record<string, number> (JSONB weights)
  | 'jsonRaw' // unknown passthrough (payloads)
  | 'raw'; // any (payloads)

export interface FieldSpec {
  /** domain property name */
  key: string;
  kind: Kind;
}

const toDate = (v: unknown): Date | null => {
  if (v === null || v === undefined) return null;
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === 'string') return new Date(v);
  if (typeof (v as { toDate?: unknown }).toDate === 'function') return (v as { toDate: () => Date }).toDate();
  throw new Error(`Cannot convert ${String(v)} to Date`);
};

const convert = (kind: Kind, v: unknown): unknown => {
  switch (kind) {
    case 'string':
      return v === null || v === undefined ? '' : String(v);
    case 'stringOrNull':
      return v === null || v === undefined ? null : String(v);
    case 'stringArray':
      if (v === null || v === undefined) return [];
      if (Array.isArray(v)) return v.map(String);
      throw new Error(`Expected array, got ${String(v)}`);
    case 'stringArrayOrNull':
      if (v === null || v === undefined) return null;
      if (Array.isArray(v)) return v.map(String);
      throw new Error(`Expected array or null, got ${String(v)}`);
    case 'number':
      return v === null || v === undefined ? 0 : Number(v);
    case 'numberOrNull':
      return v === null || v === undefined ? null : Number(v);
    case 'boolean':
      return Boolean(v ?? false);
    case 'date':
      return toDate(v);
    case 'dateOrNull':
      return toDate(v);
    case 'stringMap': {
      if (v === null || v === undefined) return {};
      if (typeof v === 'object') {
        const out: Record<string, string> = {};
        for (const [k, val] of Object.entries(v as Record<string, unknown>)) out[k] = String(val);
        return out;
      }
      return {};
    }
    case 'record':
      if (v === null || v === undefined) return {};
      if (typeof v === 'object') return v as Record<string, unknown>;
      if (typeof v === 'string') {
        try {
          return JSON.parse(v) as Record<string, unknown>;
        } catch {
          return { raw: v };
        }
      }
      return {};
    case 'recordOrNull':
      if (v === null || v === undefined) return null;
      if (typeof v === 'object') return v as Record<string, unknown>;
      if (typeof v === 'string') {
        try {
          return JSON.parse(v) as Record<string, unknown>;
        } catch {
          return { raw: v };
        }
      }
      return null;
    case 'recordNumber': {
      if (v === null || v === undefined) return {};
      const out: Record<string, number> = {};
      if (typeof v === 'object') {
        for (const [k, val] of Object.entries(v as Record<string, unknown>)) out[k] = Number(val) || 0;
      }
      return out;
    }
    default:
      return v;
  }
};

const toPersistenceValue = (kind: Kind, v: unknown): unknown => {
  switch (kind) {
    case 'date':
    case 'dateOrNull': {
      if (v === null || v === undefined) return kind === 'date' ? Timestamp.fromDate(new Date()) : null;
      return v instanceof Date ? Timestamp.fromDate(v) : typeof v === 'string' ? new Date(v) : v;
    }
    default:
      return v;
  }
};

/** Declarative one-per-entity Firestore mapper. */
export function createFirestoreMapper<T>(fields: FieldSpec[]): FirestoreMapper<T & { id: string }> {
  return {
    toDomain(doc) {
      const d = (doc.data ?? {}) as Record<string, unknown>;
      const entity: Record<string, unknown> = { id: doc.id };
      for (const spec of fields) {
        entity[spec.key] = convert(spec.kind, d[spec.key]);
      }
      return entity as T & { id: string };
    },
    toPersistence(entity) {
      const partial = (entity ?? {}) as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const spec of fields) {
        const v = partial[spec.key];
        if (v === undefined) continue;
        out[spec.key] = toPersistenceValue(spec.kind, v);
      }
      return out;
    },
  };
}
