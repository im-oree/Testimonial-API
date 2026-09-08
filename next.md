additive companies should have their own customized theme and logo that we the main company can maange and they can also manage themselves so we should ave different theme presets and also fully adjsutable mroe like tialwind pres4ets ish so it saves ont he svere make sure the tables are there  souit reflects as soon as possib;e and is probably optimzied for read and writes then also now kay when the ocmpany make sexternal website hwo do they conent the widget stuffs to be able to wokr  nciely in their app and conenct to them securly and iw ant the devs to have a full little to no code experience and also make it future proof 

```
# DOC 7 — THE CREATIVE STUDIO
## Visual Editor, CMS, Template Marketplace, Distribution & AI Design Generation

This document extends the original six-document series with the most ambitious layer of the platform: a **full visual design studio** that lets both the parent company (Zojatech) and every sub-company (tenant) create, customize, share, and deploy testimonial layouts without writing a single line of code — and with everything persisted to the server-side database because this is a SaaS platform, not a local tool.

---

## 0. What This Document Covers

| Feature | Who uses it | What it does |
|---|---|---|
| **Visual Editor** | Parent + Tenants | Photoshop-lite drag-and-drop canvas for designing testimonial widgets from scratch |
| **CMS Dashboard** | Tenants | Content management for testimonials, forms, widgets — the day-to-day operational UI |
| **Template Marketplace** | Parent → Tenants | Global template library created by parent, browsed/cloned/customized by tenants |
| **Tenant Template Library** | Tenants | Per-tenant templates shareable across their own products/apps |
| **NPM Packages** | Developers | `@testimonial-api/react`, `@testimonial-api/widget`, etc. for code-first integration |
| **Hosted JS (CDN)** | Anyone | Single `<script>` tag embed — zero code, works on any website |
| **No-Code Builder** | Non-technical users | Simplified wizard-style builder (subset of the visual editor) for quick setup |
| **AI Design Generation** | Tenants (future) | Describe what you want in plain English → AI generates a complete widget design |

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CREATIVE STUDIO                               │
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────────┐ │
│  │  VISUAL EDITOR    │  │  NO-CODE BUILDER │  │  AI DESIGN GEN      │ │
│  │  (Full Canvas)    │  │  (Wizard)        │  │  (Text → Design)    │ │
│  │  - Drag & Drop    │  │  - Step 1: Pick  │  │  - "I want a dark   │ │
│  │  - Resize/Snap    │  │    template      │  │    carousel with     │ │
│  │  - Recolor        │  │  - Step 2: Set   │  │    rounded cards     │ │
│  │  - Animate        │  │    filters       │  │    and gold stars"   │ │
│  │  - Blur/Fade      │  │  - Step 3: Colors│  │  → AI generates     │ │
│  │  - Layer control  │  │  - Step 4: Embed │  │    DesignSchema JSON │ │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────┬──────────┘ │
│           │                     │                        │            │
│           ▼                     ▼                        ▼            │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                    DESIGN SCHEMA (JSON)                          │ │
│  │  The universal output format. Every editor produces this.         │ │
│  │  The widget runtime consumes this. The database stores this.      │ │
│  └──────────────────────────────┬───────────────────────────────────┘ │
│                                  │                                    │
│           ┌──────────────────────┼──────────────────────┐             │
│           ▼                      ▼                      ▼             │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐  │
│  │ TEMPLATE      │     │ WIDGET       │     │ CMS DASHBOARD        │  │
│  │ MARKETPLACE   │     │ RUNTIME      │     │ (Content Management) │  │
│  │ (Global +     │     │ (widget.js   │     │ - Testimonials CRUD  │  │
│  │  Tenant)      │     │  CDN + npm)  │     │ - Forms management   │  │
│  │               │     │              │     │ - Analytics          │  │
│  └──────────────┘     └──────────────┘     └──────────────────────┘  │
│                                  │                                    │
│           ┌──────────────────────┼──────────────────────┐             │
│           ▼                      ▼                      ▼             │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐  │
│  │ <script> tag  │     │ npm install  │     │ WordPress/Shopify    │  │
│  │ (CDN embed)   │     │ @testimonial │     │ Plugin (one-click)   │  │
│  │               │     │ -api/react   │     │                      │  │
│  └──────────────┘     └──────────────┘     └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**Core principle:** every visual design, whether created by the full editor, the no-code wizard, or the AI generator, produces the **same output** — a `DesignSchema` JSON object. This schema is:
1. **Stored in the database** (PostgreSQL `design_schemas` table, not IndexedDB/localStorage)
2. **Versioned** (every save creates a new version, rollback possible)
3. **Consumed by the widget runtime** (`widget.js` on CDN or `@testimonial-api/react` via npm)
4. **Shareable** as a template (parent → all tenants, or tenant → across their own apps)

---

## 2. The Design Schema — Universal Format

This is the heart of the entire creative system. Every visual editor, builder, and AI generator outputs this format. The widget runtime reads this format. The database stores this format.

### 2.1 Schema Structure

```typescript
// packages/shared-types/design-schema.types.ts

export interface DesignSchema {
  id: string;                    // e.g. "dsgn_abc123"
  version: number;
  name: string;
  type: 'widget' | 'form' | 'section' | 'page';
  
  // Canvas settings
  canvas: {
    width: number | '100%';      // px or responsive
    height: number | 'auto';
    backgroundColor: string;     // hex or rgba
    backgroundImage: string | null;
    overflow: 'hidden' | 'visible' | 'scroll';
    padding: Spacing;
    borderRadius: BorderRadius;
  };

  // Element tree (nested, like DOM)
  elements: DesignElement[];

  // Global animations
  animations: AnimationDefinition[];

  // Responsive breakpoints
  breakpoints: {
    mobile: DesignOverride[];    // < 640px
    tablet: DesignOverride[];    // 640-1024px
    desktop: DesignOverride[];   // > 1024px
  };

  // Data bindings (connects to testimonial data)
  dataBindings: DataBinding[];

  // Metadata
  createdBy: string;
  tenantId: string | null;       // null = global (parent-created)
  appId: string | null;          // null = tenant-wide template
  isTemplate: boolean;
  isPremium: boolean;
  tags: string[];
  thumbnailUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DesignElement {
  id: string;                    // unique within the design
  type: ElementType;
  
  // Layout
  position: { x: number; y: number } | 'flow';  // absolute or in-flow
  size: { width: number | string; height: number | string };
  margin: Spacing;
  padding: Spacing;
  zIndex: number;
  
  // Visual
  backgroundColor: string;
  backgroundImage: string | null;
  borderRadius: BorderRadius;
  border: { width: number; color: string; style: 'solid' | 'dashed' | 'none' };
  boxShadow: ShadowDefinition;
  opacity: number;               // 0-1
  blur: number;                  // px, backdrop-blur
  overflow: 'hidden' | 'visible';
  
  // Typography (for text elements)
  typography?: {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    lineHeight: number;
    letterSpacing: number;
    color: string;
    textAlign: 'left' | 'center' | 'right';
    textDecoration: 'none' | 'underline' | 'line-through';
  };

  // Content
  content?: {
    text: string;                // static text or data binding key like "{{author.name}}"
    image: string | null;        // URL or data binding key like "{{author.avatar}}"
    video: string | null;
    icon: string | null;         // Lucide icon name
    html: string | null;         // sanitized rich text (only for premium/enterprise)
  };

  // Interaction
  interaction?: {
    hover: Partial<DesignElement>;  // property overrides on hover
    click: ClickAction | null;
    tooltip: string | null;
  };

  // Animation (per-element)
  animation?: ElementAnimation;

  // Data binding
  dataBinding?: string;          // e.g. "testimonial.message", "testimonial.rating"

  // Children (for containers)
  children: DesignElement[];

  // Visibility conditions
  conditions?: {
    showIf: string | null;       // e.g. "testimonial.rating >= 4"
    showOnHover: boolean;
    showOnScroll: boolean;
  };
}

export type ElementType =
  | 'container'       // generic box (div)
  | 'flex-row'        // horizontal flex
  | 'flex-column'     // vertical flex
  | 'grid'            // CSS grid
  | 'carousel'        // auto-sliding carousel
  | 'circular-carousel' // circular/orbital carousel
  | 'marquee'         // infinite scroll strip
  | 'text'            // text block
  | 'heading'         // h1-h6
  | 'image'           // static or bound image
  | 'avatar'          // circular avatar with fallback
  | 'video'           // video player
  | 'rating-stars'    // star rating display
  | 'rating-nps'      // NPS score display
  | 'badge'           // small label/tag
  | 'button'          // CTA button
  | 'divider'         // horizontal/vertical line
  | 'spacer'          // empty space
  | 'icon'            // Lucide icon
  | 'blur-overlay'    // frosted glass overlay
  | 'gradient-overlay' // gradient overlay
  | 'shape'           // circle, rectangle, blob
  | 'testimonial-card' // pre-built card (composite of avatar+name+stars+message)
  | 'testimonial-wall' // masonry grid of cards
  | 'form-field'      // input/textarea/rating for collection forms
  | 'custom';         // advanced: raw component reference

export interface Spacing {
  top: number; right: number; bottom: number; left: number;
}

export interface BorderRadius {
  topLeft: number; topRight: number; bottomRight: number; bottomLeft: number;
}

export interface ShadowDefinition {
  x: number; y: number; blur: number; spread: number; color: string;
}

export interface ElementAnimation {
  type: 'fade-in' | 'fade-in-up' | 'fade-in-down' | 'slide-in-left' | 'slide-in-right'
      | 'scale-in' | 'rotate-in' | 'blur-in' | 'typewriter' | 'float' | 'pulse'
      | 'bounce' | 'shimmer' | 'orbit' | 'custom';
  duration: number;              // ms
  delay: number;                 // ms
  easing: string;                // CSS easing or spring config
  iterationCount: number | 'infinite';
  direction: 'normal' | 'reverse' | 'alternate';
  trigger: 'on-load' | 'on-scroll' | 'on-hover' | 'on-click';
}

export interface AnimationDefinition {
  id: string;
  name: string;
  keyframes: Array<{
    offset: number;              // 0-1
    properties: Partial<DesignElement>;
  }>;
  duration: number;
  easing: string;
  iterationCount: number | 'infinite';
}

export interface DataBinding {
  key: string;                   // e.g. "testimonial.author.name"
  source: 'testimonial' | 'form' | 'tenant' | 'static';
  fallback: string;              // default value if data is missing
  transform: string | null;      // e.g. "uppercase", "truncate(100)", "date(YYYY)"
}

export interface DesignOverride {
  elementId: string;
  overrides: Partial<DesignElement>;  // properties that change at this breakpoint
}

export interface ClickAction {
  type: 'navigate' | 'open-modal' | 'expand' | 'play-video' | 'submit-form' | 'custom';
  target: string;
}
```

### 2.2 Example: Circular Image Carousel with Hover Reveal

This is the specific example the user described — a circular carousel of testimonial author images where hovering reveals the full testimonial.

```json
{
  "id": "dsgn_circular_hover_001",
  "version": 1,
  "name": "Circular Avatar Carousel with Hover Reveal",
  "type": "widget",
  "canvas": {
    "width": "100%",
    "height": 400,
    "backgroundColor": "transparent",
    "padding": { "top": 20, "right": 20, "bottom": 20, "left": 20 },
    "borderRadius": { "topLeft": 0, "topRight": 0, "bottomRight": 0, "bottomLeft": 0 }
  },
  "elements": [
    {
      "id": "carousel-container",
      "type": "circular-carousel",
      "position": "flow",
      "size": { "width": "100%", "height": 300 },
      "animation": {
        "type": "orbit",
        "duration": 20000,
        "delay": 0,
        "easing": "linear",
        "iterationCount": "infinite",
        "direction": "normal",
        "trigger": "on-load"
      },
      "children": [
        {
          "id": "avatar-{{index}}",
          "type": "avatar",
          "dataBinding": "testimonial.author.avatar",
          "size": { "width": 64, "height": 64 },
          "borderRadius": { "topLeft": 50, "topRight": 50, "bottomRight": 50, "bottomLeft": 50 },
          "border": { "width": 3, "color": "#4F46E5", "style": "solid" },
          "interaction": {
            "hover": {
              "size": { "width": 80, "height": 80 },
              "border": { "width": 4, "color": "#FFD700", "style": "solid" }
            },
            "click": null,
            "tooltip": null
          },
          "conditions": {
            "showOnHover": false,
            "showOnScroll": false,
            "showIf": null
          },
          "children": []
        }
      ]
    },
    {
      "id": "hover-reveal-card",
      "type": "testimonial-card",
      "position": { "x": 0, "y": 320 },
      "size": { "width": "100%", "height": "auto" },
      "backgroundColor": "#FFFFFF",
      "borderRadius": { "topLeft": 16, "topRight": 16, "bottomRight": 16, "bottomLeft": 16 },
      "boxShadow": { "x": 0, "y": 10, "blur": 25, "spread": -5, "color": "rgba(0,0,0,0.1)" },
      "opacity": 0,
      "blur": 10,
      "animation": {
        "type": "fade-in-up",
        "duration": 300,
        "delay": 0,
        "easing": "ease-out",
        "iterationCount": 1,
        "direction": "normal",
        "trigger": "on-hover"
      },
      "conditions": {
        "showOnHover": true,
        "showIf": "hoveredAvatar !== null"
      },
      "children": [
        {
          "id": "reveal-name",
          "type": "text",
          "dataBinding": "testimonial.author.name",
          "typography": { "fontSize": 16, "fontWeight": 700, "color": "#1E293B" }
        },
        {
          "id": "reveal-stars",
          "type": "rating-stars",
          "dataBinding": "testimonial.rating"
        },
        {
          "id": "reveal-message",
          "type": "text",
          "dataBinding": "testimonial.message",
          "typography": { "fontSize": 14, "fontWeight": 400, "color": "#64748B" },
          "content": { "text": "{{testimonial.message}}" }
        }
      ]
    }
  ],
  "dataBindings": [
    { "key": "testimonial.author.avatar", "source": "testimonial", "fallback": "", "transform": null },
    { "key": "testimonial.author.name", "source": "testimonial", "fallback": "Anonymous", "transform": null },
    { "key": "testimonial.rating", "source": "testimonial", "fallback": "5", "transform": null },
    { "key": "testimonial.message", "source": "testimonial", "fallback": "", "transform": "truncate(200)" }
  ]
}
```

---

## 3. The Visual Editor (Full Canvas)

### 3.1 Technology Stack

| Layer | Choice | Reasoning |
|---|---|---|
| Canvas engine | **Custom React canvas** (not GrapesJS — too heavy, too opinionated) | Full control over the schema output, tighter integration with our DesignSchema |
| Drag & drop | **dnd-kit** | Modern, accessible, performant, supports nested containers |
| Resize handles | **react-resizable-panels** + custom corner handles | Precise pixel control |
| Snap grid | Custom implementation | 8px grid snap, element-to-element snap, center-line guides |
| Color picker | **react-colorful** | Lightweight, accessible, supports hex/rgb/hsl |
| Layer panel | Custom tree view (like Figma layers) | Nested element hierarchy, drag to reorder, visibility toggle, lock |
| Property panel | Custom form (React Hook Form) | Context-sensitive: shows relevant properties for selected element |
| Animation timeline | Custom keyframe editor (simplified After Effects timeline) | Visual keyframe editing for animations |
| Preview | Live iframe | Real-time preview of the design with real testimonial data |
| Undo/redo | **Immer** + custom history stack | Immutable state snapshots, Ctrl+Z/Ctrl+Shift+Z |
| State management | **Zustand** (editor-specific store) | Complex editor state, devtools support |

### 3.2 Editor Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Top Bar: [← Back] [Design Name] [Undo] [Redo] [Preview] [Save] [Pub] │
├──────────┬──────────────────────────────────────────────┬───────────────┤
│ Left     │  CANVAS                                      │ Right Panel   │
│ Panel    │                                              │ (Properties)  │
│          │  ┌──────────────────────────────────────┐    │               │
│ ELEMENTS │  │                                      │    │ POSITION      │
│ ──────── │  │    ┌──────────┐  ┌──────────┐        │    │ X: [120] px   │
│ □ Container│ │    │  👤 Ada  │  │  👤 Ben  │        │    │ Y: [45] px    │
│ □ Flex Row │  │    │ ★★★★★   │  │ ★★★★    │        │    │ W: [320] px   │
│ □ Flex Col │  │    │ "This   │  │ "Great   │        │    │ H: [180] px   │
│ □ Grid     │  │    │  tool.."│  │  product"│        │    │               │
│ □ Carousel │  │    └──────────┘  └──────────┘        │    │ APPEARANCE    │
│ □ Text     │  │                                      │    │ BG: [#FFF] ■  │
│ □ Image    │  │         ┌──────────┐                  │    │ Radius: [12]  │
│ □ Avatar   │  │         │  👤 Cara │                  │    │ Shadow: [✓]   │
│ □ Stars    │  │         │ ★★★★★   │                  │    │ Opacity: [100]│
│ □ Button   │  │         │ "Amazing"│                  │    │ Blur: [0]     │
│ □ Badge    │  │         └──────────┘                  │    │               │
│ □ Divider  │  │                                      │    │ TYPOGRAPHY    │
│ □ Shape    │  │  [Snap guides shown as blue lines]    │    │ Font: Inter   │
│ □ Blur     │  │                                      │    │ Size: [14]    │
│ □ Gradient │  └──────────────────────────────────────┘    │ Weight: [400]  │
│          │                                              │ Color: [#333]  │
│ LAYERS   │  [Zoom: 100%] [Grid: 8px] [Snap: ON]        │               │
│ ──────── │                                              │ DATA BINDING  │
│ ▼ carousel│  ────────────────────────────────────────    │ Source:       │
│   ▼ card-1│  TIMELINE (bottom)                          │ [testimonial] │
│     avatar│  ┌────┬────┬────┬────┬────┬────┬────┐       │ Field:        │
│     name  │  │ 0s │ 1s │ 2s │ 3s │ 4s │ 5s │ 6s │       │ [message ▾]   │
│     stars │  │────│────│────│────│────│────│────│       │ Fallback:     │
│     msg   │  │ ▓▓▓│    │    │    │    │    │    │       │ ["..."]       │
│   ▼ card-2│  │    │▓▓▓▓│    │    │    │    │    │       │               │
│     ...   │  │    │    │    │▓▓▓▓│    │    │    │       │ ANIMATION     │
│          │  │ fade│slide│    │blur│    │    │    │       │ Type: [fade ▾]│
│          │  └────┴────┴────┴────┴────┴────┴────┘       │ Duration:[300]│
│          │  [▶ Play] [⏸ Pause] [Loop: ✓]               │ Delay: [0]    │
├──────────┴──────────────────────────────────────────────┴───────────────┤
│  Bottom Bar: [Mobile ▾] [Tablet] [Desktop] | [100%] | Elements: 12    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Editor Features (Detailed)

#### A. Drag & Drop
- Drag elements from the left panel onto the canvas
- Drag elements within the canvas to reposition
- Drag elements into containers to nest them
- Drag layers in the layer panel to reorder z-index
- Snap to 8px grid (toggleable)
- Snap to other elements' edges and centers (smart guides, like Figma)
- Snap to canvas center lines (horizontal + vertical)

#### B. Resize
- 8 corner/edge handles on selected element
- Shift-drag to maintain aspect ratio
- Alt-drag to resize from center
- Numeric input in properties panel for precise sizing
- Min/max size constraints per element type

#### C. Recolor
- Color picker on any color property (background, text, border, shadow)
- Hex, RGB, HSL input modes
- Opacity slider (alpha channel)
- Brand color presets (auto-populated from tenant's `brandColor` palette)
- Gradient builder (linear/radial, 2-4 stops)
- Eyedropper tool (pick color from canvas)

#### D. Border Radius
- Individual corner control (topLeft, topRight, bottomRight, bottomLeft)
- Link corners (uniform radius) or unlink (independent)
- Numeric input + slider (0-100px or 0-50%)
- Visual preview on the selected element in real time

#### E. Blur & Effects
- **Backdrop blur**: frosted glass effect (CSS `backdrop-filter: blur()`)
- **Element blur**: blur the element itself (CSS `filter: blur()`)
- **Drop shadow**: x, y, blur, spread, color controls
- **Inner shadow**: inset shadow
- **Opacity**: 0-100% slider
- **Blend mode**: multiply, screen, overlay, etc. (advanced)

#### F. Animation System
- **Per-element animations**: fade-in, slide-in, scale-in, rotate-in, blur-in, typewriter, float, pulse, bounce, shimmer
- **Carousel animations**: orbit (circular), linear (horizontal/vertical), marquee (infinite scroll)
- **Hover animations**: property transitions on hover (scale, color, shadow, opacity)
- **Scroll-triggered animations**: animate when element enters viewport (IntersectionObserver)
- **Timeline editor**: visual keyframe editor at the bottom of the canvas
  - Add keyframes at specific timestamps
  - Set property values at each keyframe
  - Interpolation between keyframes (linear, ease-in, ease-out, spring)
  - Play/pause/loop controls
- **Lottie integration** (optional, premium): import `.json` Lottie files for complex animations
  - Rendered via `lottie-web` in the widget runtime
  - Stored as a reference URL in the DesignSchema, not embedded

#### G. Data Binding
- Any text, image, or property can be bound to testimonial data
- Binding syntax: `{{testimonial.author.name}}`, `{{testimonial.rating}}`, `{{testimonial.message}}`
- Available bindings shown in a dropdown when clicking the "bind" icon on any property
- Fallback values for missing data
- Transform functions: `truncate(100)`, `uppercase`, `date(YYYY)`, `number(1)`
- Live preview with real testimonial data (fetched from the API)

#### H. Responsive Design
- Three breakpoint views: Mobile (<640px), Tablet (640-1024px), Desktop (>1024px)
- Switch between breakpoints in the bottom bar
- Override any property per breakpoint (e.g., font size 14px on desktop, 12px on mobile)
- Overrides shown as colored dots on the property label (blue = overridden)
- Preview responsive behavior in real time

#### I. Layer Management
- Tree view of all elements (like Figma's layers panel)
- Drag to reorder (changes z-index)
- Drag to nest/unnest (changes parent container)
- Visibility toggle (eye icon)
- Lock toggle (prevent accidental moves)
- Rename elements (double-click)
- Multi-select (Shift+click or drag-select)
- Group/ungroup elements

#### J. Undo/Redo
- Ctrl+Z / Ctrl+Shift+Z
- History stack of 50 states (configurable)
- Visual history panel (list of actions: "Moved avatar", "Changed color", "Added text")
- Click any history state to jump to it

### 3.4 Editor State Management

```typescript
// apps/tenant-dashboard/stores/editor.store.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { DesignSchema, DesignElement } from '@testimonial-api/shared-types';

interface EditorState {
  // Design data
  schema: DesignSchema | null;
  
  // Selection
  selectedElementIds: string[];
  hoveredElementId: string | null;
  
  // Canvas
  zoom: number;
  panOffset: { x: number; y: number };
  gridEnabled: boolean;
  snapEnabled: boolean;
  activeBreakpoint: 'mobile' | 'tablet' | 'desktop';
  
  // History
  history: DesignSchema[];
  historyIndex: number;
  
  // UI
  activePanel: 'elements' | 'layers' | 'animations';
  isPreviewMode: boolean;
  isDirty: boolean;
  
  // Actions
  loadSchema: (schema: DesignSchema) => void;
  selectElement: (id: string, multi?: boolean) => void;
  deselectAll: () => void;
  addElement: (type: ElementType, parentId?: string) => void;
  deleteElement: (id: string) => void;
  moveElement: (id: string, x: number, y: number) => void;
  resizeElement: (id: string, width: number, height: number) => void;
  updateElementProperty: (id: string, path: string, value: any) => void;
  reorderElement: (id: string, newParentId: string, newIndex: number) => void;
  duplicateElement: (id: string) => void;
  undo: () => void;
  redo: () => void;
  setZoom: (zoom: number) => void;
  setBreakpoint: (bp: 'mobile' | 'tablet' | 'desktop') => void;
  togglePreview: () => void;
  save: () => Promise<void>;
  publish: () => Promise<void>;
}

export const useEditorStore = create<EditorState>()(
  immer((set, get) => ({
    schema: null,
    selectedElementIds: [],
    hoveredElementId: null,
    zoom: 1,
    panOffset: { x: 0, y: 0 },
    gridEnabled: true,
    snapEnabled: true,
    activeBreakpoint: 'desktop',
    history: [],
    historyIndex: -1,
    activePanel: 'elements',
    isPreviewMode: false,
    isDirty: false,

    addElement: (type, parentId) => set((state) => {
      const newElement: DesignElement = {
        id: `el_${crypto.randomUUID().slice(0, 8)}`,
        type,
        position: 'flow',
        size: { width: 200, height: 100 },
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        zIndex: state.schema!.elements.length,
        backgroundColor: 'transparent',
        backgroundImage: null,
        borderRadius: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 },
        border: { width: 0, color: '#000', style: 'none' },
        boxShadow: { x: 0, y: 0, blur: 0, spread: 0, color: 'transparent' },
        opacity: 1,
        blur: 0,
        overflow: 'visible',
        children: [],
      };
      // Push to history, add element to schema, mark dirty
      state.history = state.history.slice(0, state.historyIndex + 1);
      state.history.push(JSON.parse(JSON.stringify(state.schema)));
      state.historyIndex++;
      if (parentId) {
        // Find parent and add as child
        const parent = findElementById(state.schema!.elements, parentId);
        if (parent) parent.children.push(newElement);
      } else {
        state.schema!.elements.push(newElement);
      }
      state.selectedElementIds = [newElement.id];
      state.isDirty = true;
    }),

    // ... other actions follow the same pattern:
    // 1. Push current state to history
    // 2. Mutate via Immer draft
    // 3. Mark dirty
  }))
);
```

### 3.5 Save & Publish Flow

```
1. User clicks "Save" (or Ctrl+S)
2. Editor serializes the current DesignSchema to JSON
3. POST /v1/dashboard/designs → saves to database (design_schemas table)
4. Response includes the design ID and version number
5. isDirty flag cleared
6. Toast: "Design saved (v3)"

7. User clicks "Publish"
8. PATCH /v1/dashboard/designs/:id/publish → marks as published
9. Widget runtime immediately picks up the new version (cache invalidated)
10. All embeds using this design update within 30 seconds (CDN cache TTL)
```

**Everything is saved to the server-side database.** No IndexedDB, no localStorage, no client-side persistence. If the user closes their browser mid-edit, they can reopen the editor and their last saved version is there. Unsaved changes are warned about ("You have unsaved changes. Save before leaving?").

---

## 4. CMS Dashboard (Content Management System)

The CMS is the day-to-day operational interface for managing testimonial content. It sits alongside the Visual Editor (which handles *design*) and focuses on *content*.

### 4.1 CMS Modules

| Module | Purpose | Key features |
|---|---|---|
| **Testimonials** | CRUD + moderation | Table/Kanban views, bulk actions, CSV import, AI import, search, filter, tag |
| **Collection Forms** | Gather testimonials | Form builder, public URL, QR code, embed, submission log |
| **Widgets** | Display testimonials | Widget builder (links to Visual Editor), embed codes, publish/unpublish |
| **Media Library** | Manage uploaded assets | Image/video gallery, upload, crop, delete, search |
| **Analytics** | Performance data | Recharts dashboards, source breakdown, rating trends, conversion rates |
| **Integrations** | Connect external tools | Twitter, Zapier, Slack, webhooks, CSV sync |
| **Templates** | Design templates | Browse marketplace, clone, edit, create, share across apps |

### 4.2 CMS → Visual Editor Integration

```
CMS Widget List → "Edit Design" button → Opens Visual Editor
                                          ↓
                                    Loads DesignSchema from DB
                                          ↓
                                    User edits on canvas
                                          ↓
                                    "Save" → writes DesignSchema back to DB
                                          ↓
                                    "Publish" → widget runtime picks up new design
                                          ↓
                                    Back to CMS → widget preview updates live
```

The CMS and Visual Editor share the same database records. The CMS manages the *content* (which testimonials to show, filters, data sources) and the Visual Editor manages the *presentation* (how they look, animate, and layout). Both write to the same `widgets` and `design_schemas` tables.

---

## 5. Template Marketplace

### 5.1 Three-Tier Template System

```
TIER 1: GLOBAL TEMPLATES (Parent Company / Zojatech)
  ├── Created by platform admins via the Visual Editor
  ├── Stored with tenantId = null (global)
  ├── Visible to ALL tenants in their "Browse Templates" gallery
  ├── Tenants can CLONE (creates a tenant-owned copy) but not edit the original
  ├── Versioned by the platform team
  ├── Can be marked "Premium" (gated by plan tier)
  └── Examples: "Modern Carousel", "Wall of Love", "Minimal Spotlight", "Video Grid"

TIER 2: TENANT TEMPLATES (Sub-Company)
  ├── Created by tenant staff via the Visual Editor
  ├── Stored with tenantId = their tenant ID, appId = null
  ├── Visible across ALL apps/products within that tenant
  ├── Can be cloned per-app and customized
  ├── Can be submitted to the global marketplace (parent reviews & approves)
  └── Examples: "Our Product Launch Carousel", "Customer Spotlight Grid"

TIER 3: APP-SPECIFIC DESIGNS (Per-Product)
  ├── Created by tenant staff for a specific app/product
  ├── Stored with tenantId + appId
  ├── Only visible within that app
  ├── Can be promoted to Tier 2 (tenant-wide) with one click
  └── Examples: "Mobile App Reviews Widget", "Landing Page Hero"
```

### 5.2 Template Browsing UX

```
┌─────────────────────────────────────────────────────────────────┐
│ Templates                                    [+ Create New]     │
├─────────────────────────────────────────────────────────────────┤
│ [Global Gallery] [My Templates] [My App Designs]                │
├─────────────────────────────────────────────────────────────────┤
│ Filter: [All Types ▾] [All Layouts ▾] [Free Only ▾] [🔍]       │
├────────┬────────┬────────┬──────────────────────────────────────┤
│┌──────┐│┌──────┐│┌──────┐│                                      │
││ 🎠   │││ 🧱   │││ ⭐   ││  Click any template to:              │
││Modern│││Wall  │││Spot- ││  1. Preview with your real data      │
││Carou-│││of    │││light ││  2. Clone to your templates          │
││sel   │││Love  │││      ││  3. Open in Visual Editor            │
││      │││      │││      ││  4. Use directly (quick apply)       │
││Free  │││Pro ★ │││Free  ││                                      │
││[Use] │││[Use] │││[Use] ││                                      │
│└──────┘│└──────┘│└──────┘│                                      │
├────────┼────────┼────────┤                                      │
│┌──────┐│┌──────┐│┌──────┐│                                      │
││ 🎥   │││ 🔄   │││ 📝   ││                                      │
││Video │││Circu-│││Form  ││                                      │
││Grid  │││lar   │││Wizard││                                      │
││      │││Hover │││      ││                                      │
││Pro ★ │││Free  │││Free  ││                                      │
││[Use] │││[Use] │││[Use] ││                                      │
│└──────┘│└──────┘│└──────┘│                                      │
└────────┴────────┴────────┴──────────────────────────────────────┘
```

### 5.3 Template Clone Flow

```
1. Tenant clicks "Use" on a global template
2. System creates a deep copy of the DesignSchema:
   - New ID, new version (1)
   - tenantId = tenant's ID
   - appId = null (tenant-wide) or specific app if chosen
   - isTemplate = true
   - All element IDs regenerated (to avoid conflicts)
3. Tenant can now edit their copy in the Visual Editor without affecting the original
4. When the parent updates the global template (v2, v3...), tenant gets a notification:
   "Template 'Modern Carousel' has been updated to v3. [Apply updates] [Dismiss]"
5. "Apply updates" merges the parent's changes into the tenant's copy
   (preserving tenant's customizations where possible, flagging conflicts)
```

---

## 6. Distribution System — NPM, CDN & No-Code

### 6.1 CDN Hosted JS (Zero-Code Embed)

**For anyone, any website, any platform. No npm, no build step, no developer needed.**

```html
<!-- Step 1: Copy this from the CMS dashboard -->
<script
  src="https://cdn.testimonialapi.dev/widget.js"
  data-app="app_7c1e9b"
  data-widget="wdg_5e1c8d"
  data-key="pk_live_abc123def456"
  data-theme="#FF5733"
  async
></script>
<div id="testimonial-widget"></div>
```

**What `widget.js` does:**
1. Reads `data-*` attributes from the script tag
2. Fetches `GET /v1/public/widgets/:widgetId` (returns DesignSchema + testimonials)
3. Creates a Shadow DOM container (style-isolated from host page)
4. Renders the DesignSchema using a lightweight internal renderer (~15KB gzipped)
5. Applies theme color (generates palette, injects CSS variables into Shadow DOM)
6. Handles responsive breakpoints, animations, data binding, interactions
7. Auto-refreshes testimonials every 5 minutes (configurable)

**CDN infrastructure:**
- Hosted on Cloudflare (global edge, <50ms TTFB worldwide)
- Versioned URLs: `widget.js` (latest), `widget@2.1.0.js` (pinned)
- Cache: 1 hour at edge, instant purge on widget publish
- Fallback: if CDN is down, widget gracefully degrades to a static HTML block

### 6.2 NPM Packages (Developer Integration)

| Package | Size | Purpose | Install |
|---|---|---|---|
| `@testimonial-api/widget` | ~15KB | Vanilla JS embed (same engine as CDN) | `npm i @testimonial-api/widget` |
| `@testimonial-api/react` | ~25KB | React components + hooks | `npm i @testimonial-api/react` |
| `@testimonial-api/vue` | ~20KB | Vue 3 components (phase 2) | `npm i @testimonial-api/vue` |
| `@testimonial-api/next` | ~10KB | Next.js SSR/SSG helpers | `npm i @testimonial-api/next` |
| `@testimonial-api/node` | ~8KB | Server SDK (secret key, full CRUD) | `npm i @testimonial-api/node` |
| `@testimonial-api/cli` | ~5KB | CLI tool (scaffold, test webhooks) | `npx @testimonial-api/cli` |

**React usage example:**
```tsx
import { TestimonialWidget } from '@testimonial-api/react';

function MyPage() {
  return (
    <TestimonialWidget
      appId="app_7c1e9b"
      widgetId="wdg_5e1c8d"
      publicKey="pk_live_abc123"
      theme="#FF5733"
      className="my-testimonials"
    />
  );
}
```

**Next.js SSR example:**
```tsx
import { getTestimonials } from '@testimonial-api/next';

export async function generateStaticParams() {
  const testimonials = await getTestimonials({
    appId: 'app_7c1e9b',
    publicKey: 'pk_live_abc123',
  });
  return { testimonials };
}
```

### 6.3 No-Code Builder (Simplified Wizard)

For users who find the full Visual Editor overwhelming, the No-Code Builder provides a 4-step wizard:

```
Step 1: Choose a Template
  → Gallery of pre-built designs (from the Template Marketplace)
  → Click to select, see live preview with your data

Step 2: Configure Content
  → Which testimonials to show (filter by tags, rating, source)
  → How many (slider: 1-50)
  → Sort order (newest, highest rated, random, manual)

Step 3: Customize Appearance
  → Brand color (color picker, auto-populated from tenant branding)
  → Font (dropdown: Inter, Roboto, Open Sans, system)
  → Card style (rounded, sharp, bordered, shadow)
  → Layout density (compact, comfortable, spacious)

Step 4: Get Embed Code
  → Tabs: Script tag | iframe | React | WordPress | Webflow | Shopify
  → Copy button
  → QR code for the widget URL
  → "Test on your site" instructions
```

The No-Code Builder **writes the same DesignSchema** to the database as the full Visual Editor — it just constrains the options to a curated subset. A design created in the No-Code Builder can later be opened in the full Visual Editor for advanced customization.

### 6.4 One-Click Platform Integrations (Phase 2)

| Platform | Integration type | How it works |
|---|---|---|
| WordPress | Plugin (published to wordpress.org) | Install → enter App ID + public key → select widget → shortcode auto-generated |
| Shopify | App (published to Shopify App Store) | Install → OAuth → auto-detects store domain → embed widget in theme |
| Webflow | Custom code snippet | Paste script tag in page settings → widget appears |
| Wix | Velo integration | Add HTML iframe element → paste embed code |
| Squarespace | Code block | Add code block → paste script tag |
| Framer | Component | Install Framer plugin → drag Testimonial component → configure |

---

## 7. AI Design Generation (Future Feature)

### 7.1 Concept

The tenant describes what they want in plain English, and the AI generates a complete `DesignSchema` JSON that can be immediately previewed, edited in the Visual Editor, and published.

**Example prompt:**
> "I want a dark-themed carousel with rounded cards, gold star ratings, author avatars on the left, and a subtle fade-in animation. Show 5 testimonials at a time on desktop and 1 on mobile."

**AI output:** A complete `DesignSchema` with all elements, styles, animations, responsive breakpoints, and data bindings — ready to render.

### 7.2 Architecture

```
User prompt → AI Design Generator Service
                ↓
        1. Parse intent (LLM: extract layout type, colors, animations, responsive rules)
                ↓
        2. Generate DesignSchema JSON (LLM with structured output, validated against schema)
                ↓
        3. Validate schema (Zod validation, ensure all required fields, no invalid references)
                ↓
        4. Generate thumbnail (server-side headless browser screenshot of the rendered design)
                ↓
        5. Save to database (design_schemas table, marked as AI-generated)
                ↓
        6. Return to user → live preview in the editor
                ↓
        7. User can edit further in the Visual Editor (AI output is a starting point, not final)
```

### 7.3 Integration with AI Orchestration Engine (Doc 2 Additive A)

```typescript
// New task type added to the AI orchestrator
const AI_TASK_TYPES = {
  // ... existing types from Doc 2
  GENERATE_DESIGN: 'generate_design',
};

// Prompt template for design generation
const DESIGN_GENERATION_PROMPT = `
You are a UI design engine. Given a description of a testimonial widget,
generate a complete DesignSchema JSON object.

Rules:
- Use only valid ElementType values: {{elementTypes}}
- All colors must be valid hex codes
- All sizes must be in pixels or percentage strings
- Include responsive breakpoints for mobile, tablet, desktop
- Include data bindings for testimonial fields
- Include at least one animation
- The output must be valid JSON matching this schema: {{schemaDefinition}}

User description: "{{description}}"
Brand color: "{{brandColor}}"
`;
```

### 7.4 AI Design Generation Flow (UX)

```
┌─────────────────────────────────────────────────────────────┐
│  AI Design Generator                                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Describe the testimonial widget you want:                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ "A modern dark carousel with rounded cards, gold      │   │
│  │  stars, and a fade-in animation. Show author photos   │   │
│  │  in a circle."                                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Brand color: [■ #FF5733]   Layout: [Carousel ▾]            │
│  Testimonials to show: [5]   Style: [Modern ▾]              │
│                                                              │
│  [✨ Generate Design]                                        │
│                                                              │
│  ─── Generated Preview ───                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ┌──────┐  ┌──────┐  ┌──────┐                       │   │
│  │  │ 👤   │  │ 👤   │  │ 👤   │   ← Live preview      │   │
│  │  │ ★★★★★ │  │ ★★★★  │  │ ★★★★★ │      with real data   │   │
│  │  │"Great │  │"Nice │  │"Love │                       │   │
│  │  └──────┘  └──────┘  └──────┘                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  [Edit in Visual Editor]  [Save as Template]  [Use Now]      │
│  [🔄 Regenerate]  [Refine: "Make the cards bigger"]          │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Database Schema Additions

All new tables for the Creative Studio, persisted to PostgreSQL (not IndexedDB, not localStorage).

### 8.1 New SQL Tables

```sql
-- ============================================================
-- DESIGN SCHEMAS (the core of the visual editor)
-- ============================================================
CREATE TABLE design_schemas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id         TEXT UNIQUE NOT NULL,        -- "dsgn_abc123"
  tenant_id         UUID REFERENCES tenants(id) ON DELETE CASCADE,  -- null = global
  app_id            UUID REFERENCES apps(id) ON DELETE CASCADE,     -- null = tenant-wide
  name              TEXT NOT NULL,
  type              TEXT NOT NULL DEFAULT 'widget',  -- widget, form, section, page
  version           INTEGER NOT NULL DEFAULT 1,
  schema_data       JSONB NOT NULL,              -- the full DesignSchema JSON
  thumbnail_url     TEXT,
  is_template       BOOLEAN NOT NULL DEFAULT FALSE,
  is_premium        BOOLEAN NOT NULL DEFAULT FALSE,
  is_published      BOOLEAN NOT NULL DEFAULT FALSE,
  is_ai_generated   BOOLEAN NOT NULL DEFAULT FALSE,
  parent_template_id UUID REFERENCES design_schemas(id),  -- if cloned from a global template
  tags              TEXT[] NOT NULL DEFAULT '{}',
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_designs_tenant ON design_schemas(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_designs_app ON design_schemas(app_id) WHERE app_id IS NOT NULL;
CREATE INDEX idx_designs_global ON design_schemas(is_template) WHERE tenant_id IS NULL;
CREATE INDEX idx_designs_tags ON design_schemas USING GIN (tags);

-- ============================================================
-- DESIGN VERSIONS (full history of every save)
-- ============================================================
CREATE TABLE design_versions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id         UUID NOT NULL REFERENCES design_schemas(id) ON DELETE CASCADE,
  version           INTEGER NOT NULL,
  schema_data       JSONB NOT NULL,
  change_summary    TEXT,                        -- "Changed card border radius to 16px"
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(design_id, version)
);
CREATE INDEX idx_design_versions_design ON design_versions(design_id, version DESC);

-- ============================================================
-- WIDGET-DESIGN LINK (widgets reference a design schema)
-- ============================================================
ALTER TABLE widgets ADD COLUMN design_id UUID REFERENCES design_schemas(id);
ALTER TABLE widgets ADD COLUMN design_version INTEGER;
-- When a widget is published, it pins to a specific design version.
-- When the design is updated and republished, the widget can auto-update
-- or stay pinned (tenant's choice).

-- ============================================================
-- TEMPLATE MARKETPLACE (curation + ratings)
-- ============================================================
CREATE TABLE template_marketplace (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id         UUID NOT NULL REFERENCES design_schemas(id) ON DELETE CASCADE,
  category          TEXT NOT NULL,               -- 'carousel', 'grid', 'spotlight', 'form', etc.
  description       TEXT,
  preview_video_url TEXT,                        -- optional animated preview
  use_count         INTEGER NOT NULL DEFAULT 0,  -- how many times cloned
  rating_avg        NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count      INTEGER NOT NULL DEFAULT 0,
  featured          BOOLEAN NOT NULL DEFAULT FALSE,
  status            TEXT NOT NULL DEFAULT 'active',  -- active, under_review, rejected
  submitted_by_tenant UUID REFERENCES tenants(id),  -- if a tenant submitted it
  reviewed_by       UUID REFERENCES users(id),
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MEDIA LIBRARY (centralized asset management)
-- ============================================================
CREATE TABLE media_assets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  app_id            UUID REFERENCES apps(id) ON DELETE SET NULL,
  filename          TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  content_type      TEXT NOT NULL,
  size_bytes        INTEGER NOT NULL,
  url               TEXT NOT NULL,               -- CDN URL
  thumbnail_url     TEXT,
  width             INTEGER,
  height            INTEGER,
  duration_seconds  INTEGER,                     -- for video
  alt_text          TEXT,
  tags              TEXT[] NOT NULL DEFAULT '{}',
  uploaded_by       UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_media_tenant ON media_assets(tenant_id);
CREATE INDEX idx_media_tags ON media_assets USING GIN (tags);

-- ============================================================
-- AI DESIGN GENERATION LOGS
-- ============================================================
CREATE TABLE ai_design_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES tenants(id),
  user_id           UUID REFERENCES users(id),
  prompt            TEXT NOT NULL,
  parameters        JSONB NOT NULL DEFAULT '{}',  -- brand color, layout preference, etc.
  generated_schema  JSONB,                        -- the output DesignSchema
  design_id         UUID REFERENCES design_schemas(id),  -- if saved
  status            TEXT NOT NULL,                 -- success, error, rejected
  ai_provider_id    UUID REFERENCES ai_providers(id),
  cost_usd          NUMERIC(10,6) NOT NULL DEFAULT 0,
  latency_ms        INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 8.2 New Repository Interfaces

```typescript
// packages/domain/repositories/design-schema.repository.interface.ts
export interface IDesignSchemaRepository {
  findById(id: string): Promise<DesignSchema | null>;
  findByPublicId(publicId: string): Promise<DesignSchema | null>;
  findGlobalTemplates(filters: { category?: string; tags?: string[]; premium?: boolean }): Promise<DesignSchema[]>;
  findByTenant(tenantId: string, filters?: { appId?: string; isTemplate?: boolean }): Promise<DesignSchema[]>;
  create(data: Omit<DesignSchema, 'id' | 'createdAt' | 'updatedAt'>): Promise<DesignSchema>;
  update(id: string, data: Partial<DesignSchema>): Promise<DesignSchema>;
  createVersion(designId: string, schemaData: object, changeSummary: string, createdBy: string): Promise<number>;
  getVersion(designId: string, version: number): Promise<DesignSchema | null>;
  getVersions(designId: string): Promise<Array<{ version: number; changeSummary: string; createdAt: Date }>>;
  rollbackToVersion(designId: string, version: number): Promise<DesignSchema>;
  delete(id: string): Promise<void>;
}
```

---

## 9. New API Endpoints

### 9.1 Design Schema Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/v1/dashboard/designs` | Session | List designs (tenant-scoped, filterable) |
| `POST` | `/v1/dashboard/designs` | Session | Create new design (saves full DesignSchema to DB) |
| `GET` | `/v1/dashboard/designs/:id` | Session | Get design with full schema |
| `PATCH` | `/v1/dashboard/designs/:id` | Session | Update design (creates new version) |
| `DELETE` | `/v1/dashboard/designs/:id` | Session | Delete design |
| `POST` | `/v1/dashboard/designs/:id/publish` | Session | Publish design (makes it live for widgets) |
| `GET` | `/v1/dashboard/designs/:id/versions` | Session | List version history |
| `POST` | `/v1/dashboard/designs/:id/rollback` | Session | Rollback to a specific version |
| `POST` | `/v1/dashboard/designs/:id/clone` | Session | Clone a design (for templates) |
| `GET` | `/v1/public/designs/:publicId` | `pk_*` | Get published design schema (for widget runtime) |

### 9.2 Template Marketplace Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/v1/dashboard/templates/marketplace` | Session | Browse global templates |
| `POST` | `/v1/dashboard/templates/marketplace/:id/clone` | Session | Clone global template to tenant |
| `POST` | `/v1/dashboard/templates/submit` | Session | Submit tenant template for global review |
| `GET` | `/v1/platform/templates/marketplace/review` | Platform | Review submitted templates |
| `POST` | `/v1/platform/templates/marketplace/:id/approve` | Platform | Approve for global marketplace |

### 9.3 AI Design Generation Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/v1/dashboard/ai/generate-design` | Session | Generate design from text prompt |
| `GET` | `/v1/dashboard/ai/design-history` | Session | List past AI-generated designs |
| `POST` | `/v1/dashboard/ai/refine-design` | Session | Refine an existing design with a follow-up prompt |

### 9.4 Media Library Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/v1/dashboard/media` | Session | List media assets |
| `POST` | `/v1/dashboard/media/upload` | Session | Upload file (multipart) |
| `DELETE` | `/v1/dashboard/media/:id` | Session | Delete asset |
| `PATCH` | `/v1/dashboard/media/:id` | Session | Update metadata (alt text, tags) |

---

## 10. Widget Runtime — Design Schema Renderer

The `widget.js` (CDN) and `@testimonial-api/react` (npm) both use the same rendering engine that interprets a `DesignSchema` and produces DOM elements.

### 10.1 Rendering Pipeline

```
1. Fetch DesignSchema from API (GET /v1/public/designs/:publicId)
2. Fetch testimonials from API (GET /v1/public/testimonials?appId=...)
3. Merge data: bind testimonial fields to elements with dataBinding keys
4. For each element in the tree:
   a. Create DOM element (or React component) based on `type`
   b. Apply styles from the schema (position, size, colors, typography, etc.)
   c. Apply responsive overrides for current viewport
   d. Attach interaction handlers (hover, click)
   e. Register animations (CSS keyframes or JS-driven)
5. Mount the element tree into the container (Shadow DOM for CDN, React tree for npm)
6. Start animation loops (carousels, marquees, orbits)
7. Set up IntersectionObserver for scroll-triggered animations
8. Auto-refresh testimonials on interval (configurable, default 5 min)
```

### 10.2 Element Type Renderers

Each `ElementType` maps to a renderer function:

| Type | Renderer | Output |
|---|---|---|
| `container` | `<div>` with styles | Generic box |
| `flex-row` | `<div style="display:flex; flex-direction:row">` | Horizontal layout |
| `flex-column` | `<div style="display:flex; flex-direction:column">` | Vertical layout |
| `grid` | `<div style="display:grid; grid-template-columns:...">` | CSS grid |
| `carousel` | Custom slider with auto-play, dots, arrows | Horizontal slider |
| `circular-carousel` | CSS transform-based orbital animation | Circular/orbital layout |
| `marquee` | CSS animation `translateX` infinite loop | Infinite scroll strip |
| `text` | `<p>` or `<span>` | Text content |
| `heading` | `<h1>`-`<h6>` | Heading |
| `image` | `<img>` with lazy loading | Image |
| `avatar` | `<img>` with circular clip + fallback initials | Avatar |
| `video` | `<video>` with controls + lightbox | Video player |
| `rating-stars` | SVG star icons, filled based on rating | Star rating |
| `rating-nps` | Colored bar + number | NPS score |
| `badge` | `<span>` with pill styling | Label/tag |
| `button` | `<button>` or `<a>` | CTA |
| `divider` | `<hr>` | Line |
| `spacer` | `<div>` with height | Empty space |
| `icon` | Inline SVG (Lucide icons bundled) | Icon |
| `blur-overlay` | `<div>` with `backdrop-filter: blur()` | Frosted glass |
| `gradient-overlay` | `<div>` with CSS gradient | Gradient |
| `shape` | `<div>` or `<svg>` | Circle, rect, blob |
| `testimonial-card` | Composite: avatar + name + stars + message | Pre-built card |
| `testimonial-wall` | Masonry layout of testimonial-cards | Wall of love |
| `form-field` | `<input>`, `<textarea>`, `<select>` | Form input |

---

# ✅ DOC 7 — REQUIREMENTS CHECKLIST & DEFINITION OF DONE

## A. Design Schema Checks

- [ ] `DesignSchema` TypeScript interface exists in `packages/shared-types/` with all fields from §2.1
- [ ] Zod validation schema exists for `DesignSchema` and rejects invalid JSON structures — verified with 10+ malformed inputs
- [ ] Every `ElementType` listed in §2.2 has a corresponding renderer in the widget runtime — verified by rendering a design containing one of each type
- [ ] Data binding syntax (`{{testimonial.author.name}}`) correctly resolves to real testimonial data at render time — verified with a design containing 5 different bindings
- [ ] Responsive breakpoint overrides apply correctly at each viewport width — verified by resizing the browser and confirming element properties change at 640px and 1024px
- [ ] DesignSchema JSON is stored in the `design_schemas` PostgreSQL table (not IndexedDB, not localStorage) — verified by inspecting the database after saving a design

## B. Visual Editor Checks

- [ ] Editor canvas renders elements from a loaded DesignSchema — verified by loading a saved design and confirming all elements appear
- [ ] Drag and drop works: drag from element panel to canvas, drag within canvas, drag into containers — verified
- [ ] Resize handles work: 8 handles, Shift for aspect ratio, Alt for center-resize — verified
- [ ] Snap to grid (8px) and snap to other elements (smart guides) work — verified
- [ ] Color picker works on all color properties (background, text, border, shadow) — verified
- [ ] Border radius control works: uniform and per-corner — verified
- [ ] Blur effect (backdrop + element) renders correctly — verified
- [ ] Animation timeline allows adding keyframes, setting property values, and playing the animation — verified
- [ ] Per-element animations (fade-in, slide-in, scale-in, blur-in, orbit, pulse) render correctly — verified
- [ ] Hover interactions (property overrides on hover) work — verified
- [ ] Scroll-triggered animations fire when element enters viewport — verified
- [ ] Data binding dropdown shows available testimonial fields and binds correctly — verified
- [ ] Layer panel shows element tree, supports drag-to-reorder, visibility toggle, lock — verified
- [ ] Undo/redo works (Ctrl+Z / Ctrl+Shift+Z) with 50-state history — verified
- [ ] Responsive breakpoint switching (mobile/tablet/desktop) shows correct overrides — verified
- [ ] Live preview mode renders the design with real testimonial data — verified
- [ ] Save writes the DesignSchema to the database and increments version — verified
- [ ] Publish marks the design as live and the widget runtime picks it up within 30 seconds — verified
- [ ] Unsaved changes warning appears when navigating away with dirty state — verified

## C. CMS Dashboard Checks

- [ ] All CMS modules (Testimonials, Forms, Widgets, Media, Analytics, Integrations, Templates) are accessible from the dashboard nav — verified
- [ ] "Edit Design" button on a widget opens the Visual Editor with the correct DesignSchema loaded — verified
- [ ] Saving a design in the Visual Editor and returning to the CMS shows the updated widget preview — verified
- [ ] Media Library supports upload, crop, delete, search, and tag — verified
- [ ] Uploaded media is stored in GCS/S3 (not local filesystem) and served via CDN — verified

## D. Template Marketplace Checks

- [ ] Global templates (parent-created, `tenantId = null`) appear in all tenants' "Browse Templates" gallery — verified
- [ ] Cloning a global template creates a tenant-owned copy with a new ID and version 1 — verified
- [ ] Editing a cloned template does not affect the original global template — verified
- [ ] Tenant templates are visible across all apps within that tenant — verified
- [ ] App-specific designs can be promoted to tenant-wide templates — verified
- [ ] Template version update notification appears when the parent updates a global template — verified
- [ ] Premium templates are gated by plan tier (free tenants see "Upgrade to use" instead of "Use") — verified

## E. Distribution Checks

- [ ] CDN `widget.js` loads and renders a widget from a `<script>` tag on a plain HTML page — verified
- [ ] CDN `widget.js` creates a Shadow DOM that is style-isolated from the host page — verified
- [ ] CDN `widget.js` applies the `data-theme` color correctly — verified
- [ ] `@testimonial-api/react` `<TestimonialWidget>` component renders correctly in a Next.js app — verified
- [ ] `@testimonial-api/node` server SDK can fetch and manipulate testimonials — verified
- [ ] No-Code Builder wizard produces a valid DesignSchema and generates correct embed code — verified
- [ ] Embed code works on WordPress (via code block), Webflow (via custom code), and Shopify (via theme editor) — verified

## F. AI Design Generation Checks (when implemented)

- [ ] Text prompt generates a valid DesignSchema that passes Zod validation — verified with 5 diverse prompts
- [ ] Generated design renders correctly in the preview pane with real testimonial data — verified
- [ ] "Edit in Visual Editor" opens the generated design for further customization — verified
- [ ] "Refine" follow-up prompt modifies the existing design rather than starting from scratch — verified
- [ ] AI generation cost and latency are logged in `ai_design_logs` table — verified
- [ ] Malformed AI output is caught by validation and retried (not rendered as broken UI) — verified

## G. Database Persistence Checks

- [ ] All designs are stored in the `design_schemas` PostgreSQL table — verified by querying the DB directly
- [ ] All design versions are stored in the `design_versions` table — verified by saving 3 versions and confirming all 3 exist
- [ ] Rollback to a previous version restores the correct schema data — verified
- [ ] Media assets are tracked in the `media_assets` table with CDN URLs — verified
- [ ] No design data is stored in IndexedDB, localStorage, or any client-side storage — verified by searching the frontend codebase for `indexedDB`, `localStorage.setItem`, `sessionStorage.setItem` (only allowed for UI preferences like theme and sidebar state, never for design data)
- [ ] Closing the browser and reopening the editor loads the last saved version from the database — verified

## H. Performance Checks

- [ ] Visual Editor loads in <2 seconds with a 50-element design — verified
- [ ] Canvas interactions (drag, resize, recolor) respond in <16ms (60fps) — verified via Chrome DevTools Performance tab
- [ ] Widget runtime renders a 20-testimonial carousel in <500ms on a 3G connection — verified via Lighthouse
- [ ] CDN `widget.js` bundle is <20KB gzipped — verified via `gzip -c widget.js | wc -c`
- [ ] DesignSchema JSON for a complex design (50+ elements) is <100KB — verified

## I. Sign-Off Gate

Doc 7 is only complete when:

1. A non-technical user can create a complete testimonial widget using the No-Code Builder in under 5 minutes, embed it on their website, and see live testimonials — verified by user testing with 3 non-technical participants.
2. A designer can create a complex custom layout in the Visual Editor (circular carousel with hover reveal, animations, responsive breakpoints), save it, and publish it — verified by having a designer complete the task in under 30 minutes.
3. A developer can install `@testimonial-api/react`, add a `<TestimonialWidget>` component, and see it render with real data in under 5 minutes — verified by following the quickstart docs.
4. All designs, versions, media, and templates are persisted in the PostgreSQL database and survive a full server restart with zero data loss — verified.
5. The template marketplace correctly flows designs from parent → tenant → app with proper cloning, versioning# DOC 7A — REQUIREMENTS CHECKLIST (continued)

## F. Persistence Checks (continued)

- [ ] All design data is stored in PostgreSQL (not IndexedDB, not localStorage) — verified by querying the DB after saving
- [ ] Closing the browser and reopening the editor loads the last saved version from the database with zero data loss — verified by saving a 20-element design, closing the tab, reopening, and confirming all elements, styles, animations, and bindings are intact
- [ ] Saving a design creates a new entry in `design_versions` with the full schema snapshot — verified by saving 3 times and confirming 3 version rows exist with correct `schema_data`
- [ ] Unsaved changes are NOT persisted — verified by making changes, closing the tab without saving, reopening, and confirming the design matches the last saved version (not the unsaved edits)
- [ ] Media asset records are stored in `media_assets` table with CDN URLs — verified
- [ ] Template marketplace entries are stored in `template_marketplace` table — verified
- [ ] AI design generation logs are stored in `ai_design_logs` table with prompt, output, cost, and latency — verified

## G. Security Baseline (Blueprint-Level)

- [ ] `schema_data` JSONB column is validated by Zod before insertion — no raw user JSON is written to the database without passing through the DesignSchema validator — verified by attempting to insert a schema with `<script>alert(1)</script>` in a text element and confirming it is either sanitized or rejected
- [ ] Public endpoint (`GET /v1/public/designs/:publicId`) returns only designs where `is_published = true` AND the design's `tenantId` matches the API key's tenant — verified by attempting to access an unpublished design and a cross-tenant design, both returning 404
- [ ] `schema_data` size is capped at 2MB per design to prevent storage abuse — verified by attempting to save a 5MB schema and confirming rejection with `413 FILE_TOO_LARGE`
- [ ] Media upload signed URLs expire within 5 minutes — verified
- [ ] No design data leaks into error responses — verified by triggering a validation error and confirming the response contains no schema content

## H. Documentation Artifacts

- [ ] `DESIGN_SCHEMA_REFERENCE.md` exists documenting every field, type, and constraint of the DesignSchema — suitable for third-party developers building custom renderers
- [ ] OpenAPI spec includes all new endpoints from §4 with full request/response schemas — verified at `/v1/docs`
- [ ] Example DesignSchema JSON files committed to `/docs/examples/` for each major layout type (carousel, grid, wall, spotlight, circular, marquee, form) — at least 7 examples
- [ ] Widget runtime README documents the `<script>` tag API, `data-*` attributes, and programmatic initialization — verified

## I. Sign-Off Gate

Doc 7A is only complete when:

1. The full DesignSchema from §1.3 (circular carousel with hover reveal) can be:
   - Validated by the Zod schema without errors
   - Inserted into PostgreSQL via the API
   - Fetched back via the public API
   - Rendered by the widget runtime in a browser
   - All in a single end-to-end test that passes in CI

2. Both database adapters (Postgres + Firestore) pass the identical design CRUD test suite — create, read, update, version, clone, rollback, delete — with zero adapter-specific test failures.

3. The widget runtime renders at least 3 different design types (carousel, grid, spotlight) correctly from database-stored schemas, with data bindings resolved and responsive overrides applied.

4. CI is green on: TypeScript compilation, Zod validation tests, repository integration tests (both adapters), API endpoint tests, widget runtime rendering tests, and security baseline tests.

5. This checklist is fully checked and attached to the milestone PR.

**A DesignSchema that validates but cannot be rendered, or renders but cannot be saved, is not considered done. The full round-trip — validate → save → version → fetch → render — must work end-to-end.**

---

Say **"Doc 7B"** and I'll deliver the Engine — the Visual Editor's internal architecture: state management (Zustand + Immer), the rendering pipeline (schema → canvas DOM), the animation engine, data binding resolver, undo/redo history stack, snap/grid system, and the element factory that maps every `ElementType` to an editable canvas component. This is the "muscles" of the Creative Studio, built directly on the Blueprint from 7A.
```