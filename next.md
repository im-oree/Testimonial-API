```
# DOC 7C — THE CANVAS
## Complete UI Specification: Editor Pages, CMS Modules, Template Marketplace, No-Code Builder & AI Generator

This document defines **every screen, every component, every interaction state, every empty/loading/error state** for the Creative Studio's user-facing interfaces. It consumes the engine from Doc 7B and the schema from Doc 7A, and it provides the structural skeleton that Doc 7D will style and Doc 7E will secure.

---

## 0. Page Inventory Overview

```
apps/tenant-dashboard/app/(dashboard)/
├── designs/                          # Visual Editor
│   ├── page.tsx                      # Design list (gallery)
│   ├── new/
│   │   └── page.tsx                  # Create new design (wizard)
│   └── [designId]/
│       ├── page.tsx                  # Full Visual Editor canvas
│       └── preview/
│           └── page.tsx              # Fullscreen preview
├── cms/                              # Content Management
│   ├── testimonials/
│   │   ├── page.tsx                  # Testimonial list (table + kanban)
│   │   └── [testimonialId]/
│   │       └── page.tsx              # Testimonial detail/edit
│   ├── forms/
│   │   ├── page.tsx                  # Form list
│   │   └── [formId]/
│   │       ├── page.tsx              # Form builder
│   │       └── submissions/
│   │           └── page.tsx          # Submission log
│   ├── widgets/
│   │   ├── page.tsx                  # Widget list
│   │   └── [widgetId]/
│   │       └── page.tsx              # Widget config + embed
│   ├── media/
│   │   └── page.tsx                  # Media library
│   └── analytics/
│       └── page.tsx                  # Analytics dashboard
├── templates/                        # Template Marketplace
│   ├── page.tsx                      # Browse gallery
│   ├── [templateId]/
│   │   └── page.tsx                  # Template preview + clone
│   └── my/
│       └── page.tsx                  # My templates (tenant-wide)
├── builder/                          # No-Code Builder
│   └── page.tsx                      # 4-step wizard
└── ai/                               # AI Design Generator
    └── page.tsx                      # Prompt → design

apps/platform-dashboard/app/(dashboard)/
└── templates/
    ├── marketplace/
    │   ├── page.tsx                  # Global template management
    │   └── review/
    │       └── page.tsx              # Review queue
    └── create/
        └── page.tsx                  # Create global template (opens editor)
```

---

## 1. Design List Page (`/designs`)

### 1.1 Page Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ PageHeader: "My Designs"                    [+ Create New]      │
├─────────────────────────────────────────────────────────────────┤
│ [All ▾] [Widgets] [Forms] [Sections]  [🔍 Search designs...]   │
│ [My App ▾] [My Templates] [AI Generated]                       │
├────────┬────────┬────────┬──────────────────────────────────────┤
│┌──────┐│┌──────┐│┌──────┐│                                      │
││ 🎨   │││ 🎨   │││ 🤖   ││                                      │
││      │││      │││      ││                                      │
││Carou-│││Grid  │││AI-Gen││                                      │
││sel v3│││Wall  │││Spot  ││                                      │
││      │││ v1   │││light ││                                      │
││● Live│││● Draft││● Live ││                                      │
││Jan 15│││Jan 12│││Jan 10││                                      │
││[Edit]│││[Edit]│││[Edit]││                                      │
││[⋯]   │││[⋯]   │││[⋯]   ││                                      │
│└──────┘│└──────┘│└──────┘│                                      │
└────────┴────────┴────────┴──────────────────────────────────────┘
```

### 1.2 Components

```
designs/
├── page.tsx                           # Page wrapper + data fetching
└── components/
    ├── DesignGallery.tsx              # Responsive grid of DesignCard
    ├── DesignCard.tsx                 # Thumbnail + name + version + status + date
    ├── DesignCardThumbnail.tsx        # Static preview image or live mini-render
    ├── DesignCardActions.tsx          # Edit, Duplicate, Delete, Publish/Unpublish
    ├── DesignFilters.tsx              # Type, app, status, AI-generated, search
    ├── DesignSortDropdown.tsx         # Newest, Oldest, Name, Most Used
    ├── CreateDesignButton.tsx         # Opens CreateDesignDialog
    ├── CreateDesignDialog.tsx         # Name + type picker → navigates to /designs/new
    ├── DesignEmptyState.tsx           # "No designs yet" + CTA to create or browse templates
    └── DesignLoadingGrid.tsx          # 6 skeleton cards with shimmer
```

### 1.3 States

| State | Trigger | UI |
|---|---|---|
| Loading | Initial fetch | 6 skeleton cards shimmering |
| Empty | Zero designs | `DesignEmptyState`: icon + "Create your first design" button + "Or browse templates" link |
| Empty (filtered) | Filters return zero | "No designs match your filters" + "Clear filters" button |
| Loaded | Data fetched | Grid of `DesignCard` components |
| Error | API failure | `Alert` error banner + "Retry" button |

### 1.4 Data Fetching

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: queryKeys.designs.list(tenantId, filters),
  queryFn: () => apiClient.get('/v1/dashboard/designs', { params: filters }),
});
```

---

## 2. Create New Design Page (`/designs/new`)

### 2.1 Page Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ [← Back to Designs]    Create New Design                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Design Name: [________________________]                         │
│                                                                  │
│  What are you creating?                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ 🎠       │ │ 📝       │ │ 🧩       │ │ 📄       │            │
│  │ Widget   │ │ Form     │ │ Section  │ │ Page     │            │
│  │          │ │          │ │          │ │          │            │
│  │ Display  │ │ Collect  │ │ Reusable │ │ Full     │            │
│  │ testimo- │ │ testimo- │ │ content  │ │ landing  │            │
│  │ nials    │ │ nials    │ │ block    │ │ page     │            │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
│                                                                  │
│  Start from:                                                     │
│  ○ Blank Canvas                                                  │
│  ○ Template (browse gallery)                                     │
│  ○ AI Generation (describe what you want)                        │
│  ○ Clone Existing Design [▾ Select]                              │
│                                                                  │
│  Assign to App: [Marketing Site ▾]                               │
│                                                                  │
│                    [Cancel]  [Create & Open Editor →]            │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Components

```
designs/new/
├── page.tsx
└── components/
    ├── DesignTypePicker.tsx           # 4 cards: Widget, Form, Section, Page
    ├── StartFromPicker.tsx            # Radio: Blank, Template, AI, Clone
    ├── TemplateMiniGallery.tsx        # Inline 3-template preview (shown when "Template" selected)
    ├── AppSelector.tsx                # Dropdown of tenant's apps
    └── CreateDesignForm.tsx           # React Hook Form wrapper
```

### 2.3 Flow

```
1. User fills name, picks type, picks start method, picks app
2. Click "Create & Open Editor"
3. POST /v1/dashboard/designs → creates DesignSchema in DB
4. If "Template": clones the selected template's schema
5. If "AI": redirects to /ai with the design ID pre-loaded
6. Redirect to /designs/[newDesignId] (opens Visual Editor)
```

---

## 3. Visual Editor Page (`/designs/[designId]`)

### 3.1 Full Page Layout

This is the most complex page in the entire platform. Every component is listed.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ TOP BAR                                                                 │
│ [← Designs] [Design Name ✏️] [v3] [● Unsaved] [↩][↪] [👁 Preview] [💾 Save] [🚀 Publish] │
├──────────┬──────────────────────────────────────────────┬───────────────┤
│ LEFT     │  CANVAS                                      │ RIGHT PANEL   │
│ PANEL    │                                              │ (Properties)  │
│ (w-64)   │  ┌──────────────────────────────────────┐    │ (w-80)        │
│          │  │                                      │    │               │
│ ELEMENTS │  │    [Element]  [Element]              │    │ ELEMENT       │
│ ──────── │  │    [Element]  [Element]              │    │ Name: [Card]  │
│ □ Box    │  │                                      │    │ Type: card    │
│ □ Flex→  │  │         [Element]                    │    │ ☑ Visible     │
│ □ Flex↓  │  │                                      │    │ ☐ Locked      │
│ □ Grid   │  │  ═══ snap guide ═══                  │    │               │
│ □ Stack  │  │                                      │    │ LAYOUT        │
│          │  │  [Selection box]                     │    │ X:[120] Y:[45]│
│ CONTENT  │  │                                      │    │ W:[320] H:[▾] │
│ ──────── │  └──────────────────────────────────────┘    │ Margin:[🔲]   │
│ T Text   │                                              │ Padding:[🔲]  │
│ H Head   │  [Zoom: 100%] [Grid: 8px ☑] [Snap ☑]       │               │
│ I Image  │  [Mobile] [Tablet] [Desktop ●]               │ APPEARANCE    │
│ A Avatar │                                              │ BG:[#FFF] ■   │
│ V Video  │  ────────────────────────────────────────    │ Radius:[12]   │
│ ★ Stars  │  TIMELINE (collapsible)                      │ Shadow:[✓]    │
│ 🔘 Button│  ┌────┬────┬────┬────┬────┬────┐            │ Opacity:[100] │
│ 🏷 Badge │  │ 0s │ 1s │ 2s │ 3s │ 4s │ 5s │            │ Blur:[0]      │
│ ─ Line   │  │ ▓▓▓│    │    │    │    │    │            │ B.Blur:[0]    │
│ ⬜ Shape │  │ fade│    │    │slide│    │    │            │               │
│ 💧 Blur  │  └────┴────┴────┴────┴────┴────┘            │ TYPOGRAPHY    │
│ 🌈 Grad  │  [▶ Play] [⏸] [🔁 Loop]                     │ Font: Inter   │
│          │                                              │ Size:[14]     │
│ LAYERS   │                                              │ Weight:[400]  │
│ ──────── │                                              │ Color:[#333]  │
│ ▼ carousel│                                              │ Align:[←]     │
│   ▼ card │                                              │               │
│     avatar│                                              │ DATA BINDING  │
│     name │                                              │ [testimonial  │
│     stars│                                              │  .message ▾]  │
│     msg  │                                              │               │
│   ▼ card │                                              │ ANIMATION     │
│     ...  │                                              │ [fade-in-up▾] │
│          │                                              │ Dur:[300]ms   │
│ MEDIA    │                                              │ Delay:[0]ms   │
│ ──────── │                                              │ Trigger:[load]│
│ 🖼 img1  │                                              │               │
│ 🖼 img2  │                                              │ [More ▾]      │
│ 🎥 vid1  │                                              │               │
├──────────┴──────────────────────────────────────────────┴───────────────┤
│ STATUS BAR: Elements: 24 | Selected: 1 | Zoom: 100% | 1280×800 | v3   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Complete Component Tree

```
designs/[designId]/
├── page.tsx                              # Editor shell: loads design, initializes store
└── components/
    ├── EditorShell.tsx                    # Flex layout: left + canvas + right
    │
    ├── topbar/
    │   ├── EditorTopbar.tsx               # Full top bar container
    │   ├── DesignNameEditor.tsx           # Inline-editable design name
    │   ├── VersionBadge.tsx               # "v3" badge
    │   ├── DirtyIndicator.tsx             # "● Unsaved" dot
    │   ├── UndoRedoButtons.tsx            # ↩ ↪ buttons with disabled states
    │   ├── PreviewToggle.tsx              # 👁 toggle preview mode
    │   ├── SaveButton.tsx                 # 💾 with loading spinner
    │   ├── PublishButton.tsx              # 🚀 with confirm dialog
    │   └── EditorMenu.tsx                 # ⋯ dropdown: Export JSON, Code View, Settings
    │
    ├── canvas/
    │   ├── EditorCanvas.tsx               # Root canvas (scrollable, zoomable)
    │   ├── CanvasViewport.tsx             # Zoom/pan transform wrapper
    │   ├── CanvasElement.tsx              # Per-element wrapper (from Doc 7B §2.2)
    │   ├── ElementContentRenderer.tsx     # Renderer registry (from Doc 7B §11.1)
    │   ├── SelectionOverlay.tsx           # Blue border + element name label
    │   ├── ResizeHandles.tsx              # 8 corner/edge handles
    │   ├── HoverOverlay.tsx               # Light blue hover border
    │   ├── SnapGuides.tsx                 # Blue alignment lines
    │   ├── GridOverlay.tsx                # 8px dot grid background
    │   ├── RulerOverlay.tsx               # Top + left pixel rulers
    │   ├── SelectionBox.tsx               # Rubber-band drag rectangle
    │   ├── DropIndicator.tsx              # Green line for drop target
    │   ├── CanvasContextMenu.tsx          # Right-click menu: Copy, Paste, Delete, Duplicate, Lock, Bring to Front
    │   ├── CanvasZoomControls.tsx         # Zoom in/out/fit/100% buttons
    │   ├── CanvasBreakpointSwitcher.tsx   # Mobile / Tablet / Desktop toggle
    │   └── CanvasGridToggle.tsx           # Grid + Snap on/off toggles
    │
    ├── left-panel/
    │   ├── LeftPanel.tsx                  # Tabbed container: Elements | Layers | Media | Templates
    │   ├── ElementPalette.tsx             # Draggable element type cards
    │   ├── ElementPaletteItem.tsx         # Single draggable item (icon + label)
    │   ├── LayerTree.tsx                  # Nested tree view of all elements
    │   ├── LayerTreeItem.tsx              # Single layer: icon + name + visibility + lock
    │   ├── LayerDragHandle.tsx            # Drag to reorder layers
    │   ├── MediaBrowser.tsx               # Thumbnail grid of uploaded media
    │   ├── MediaBrowserItem.tsx           # Single media thumbnail + drag to canvas
    │   └── TemplateQuickInsert.tsx        # Mini template gallery for quick insert
    │
    ├── right-panel/
    │   ├── RightPanel.tsx                 # Tabbed container: Properties | Animation | Data | Responsive
    │   ├── PropertyPanel.tsx              # Context-sensitive property editor (Doc 7B §9.1)
    │   ├── LayoutSection.tsx              # Position, size, margin, padding, flex, grid
    │   ├── AppearanceSection.tsx          # BG, border, radius, shadow, opacity, blur
    │   ├── TypographySection.tsx          # Font, size, weight, color, align, spacing
    │   ├── ContentSection.tsx             # Text, image, video, icon inputs
    │   ├── InteractionSection.tsx         # Hover, click, tooltip, transition
    │   ├── DataBindingSection.tsx         # Binding selector + preview (Doc 7B §9.2)
    │   ├── AnimationSection.tsx           # Type, duration, delay, easing, trigger, keyframes
    │   ├── ResponsiveSection.tsx          # Breakpoint overrides list
    │   ├── SpacingEditor.tsx              # Visual margin/padding box editor (4 inputs)
    │   ├── BorderRadiusEditor.tsx         # 4-corner radius with link/unlink toggle
    │   ├── BorderEditor.tsx               # Per-side width, color, style
    │   ├── ShadowEditor.tsx               # Add/remove shadows, x/y/blur/spread/color
    │   ├── ColorPickerField.tsx           # Color input with swatches + gradient builder
    │   ├── GradientBuilder.tsx            # Linear/radial, stops, direction
    │   ├── TransformEditor.tsx            # Rotate, scale, skew, translate inputs
    │   ├── FilterEditor.tsx               # Blur, brightness, contrast, saturate, grayscale
    │   └── CarouselConfigEditor.tsx       # Direction, autoplay, speed, navigation, items per view
    │
    ├── timeline/
    │   ├── TimelinePanel.tsx              # Bottom panel: animation timeline
    │   ├── TimelineTrack.tsx              # Per-element track with keyframe diamonds
    │   ├── TimelineKeyframe.tsx           # Draggable keyframe marker
    │   ├── TimelinePlayhead.tsx           # Current time indicator
    │   ├── TimelineRuler.tsx              # Time scale (0s, 1s, 2s...)
    │   ├── TimelineControls.tsx           # Play, Pause, Loop, Speed
    │   └── TimelinePropertyRow.tsx        # Animated property row (opacity, transform, etc.)
    │
    ├── preview/
    │   ├── PreviewOverlay.tsx             # Full-canvas preview mode overlay
    │   ├── PreviewDeviceFrame.tsx         # Phone/tablet/desktop frame mockup
    │   └── PreviewDataCycler.tsx          # Cycle through testimonials in preview
    │
    ├── code-view/
    │   ├── CodeViewPanel.tsx              # Raw JSON schema viewer/editor (Monaco)
    │   └── CodeViewDiff.tsx               # Diff between current and last saved version
    │
    └── renderers/                         # One per ElementType (from Doc 7B §11.2)
        ├── TextRenderer.tsx
        ├── ImageRenderer.tsx
        ├── AvatarRenderer.tsx
        ├── ButtonRenderer.tsx
        ├── RatingStarsRenderer.tsx
        ├── TestimonialCardRenderer.tsx
        ├── CarouselRenderer.tsx
        ├── CircularCarouselRenderer.tsx
        ├── MarqueeRenderer.tsx
        ├── MasonryRenderer.tsx
        ├── VideoRenderer.tsx
        ├── IconRenderer.tsx
        ├── DividerRenderer.tsx
        ├── ShapeRenderer.tsx
        ├── BlurOverlayRenderer.tsx
        ├── BadgeRenderer.tsx
        ├── SpacerRenderer.tsx
        ├── FormFieldRenderer.tsx
        ├── LottieRenderer.tsx
        └── ContainerRenderer.tsx
```

### 3.3 Editor States

| State | UI |
|---|---|
| Loading design | Full-page skeleton: left panel skeleton + canvas skeleton + right panel skeleton |
| Design loaded | Full editor interactive |
| Preview mode | Canvas fills full width, left/right panels hidden, top bar simplified, real data rendered |
| Code view | Monaco editor replaces canvas, showing raw DesignSchema JSON |
| Saving | Save button shows spinner, "Saving..." text |
| Saved | Toast "Saved v4", dirty indicator clears |
| Publish confirm | Dialog: "Publish this design? All embeds will update within 30 seconds." |
| Unsaved changes warning | On navigation: "You have unsaved changes. Save before leaving?" with Save/Discard/Cancel |
| Error loading | "Failed to load design" + Retry button + Back to list link |
| Design deleted | Redirect to /designs with toast "Design deleted" |

---

## 4. Fullscreen Preview Page (`/designs/[designId]/preview`)

### 4.1 Page Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ [← Back to Editor]  Preview: "Circular Carousel"  [Desktop ▾]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │          [Live rendered widget with real data]            │   │
│  │                                                          │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Testimonial: [1/10 ▾]  [← Prev] [Next →]  [Auto-cycle ☑]      │
│  Background: [White] [Dark] [Custom #___]  [Transparent]        │
│  Width: [━━━━●━━━━] 1280px                                      │
│                                                                  │
│  [Copy Embed Code]  [Open in New Tab]  [Share Preview Link]     │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Components

```
designs/[designId]/preview/
├── page.tsx
└── components/
    ├── PreviewRenderer.tsx              # Renders DesignSchema using widget runtime engine
    ├── PreviewDeviceSelector.tsx        # Desktop / Tablet / Mobile / Custom width
    ├── PreviewTestimonialCycler.tsx     # Cycle through real testimonials
    ├── PreviewBackgroundPicker.tsx      # White / Dark / Custom / Transparent
    ├── PreviewWidthSlider.tsx           # Responsive width slider
    └── PreviewShareButton.tsx           # Generate shareable preview link
```

---

## 5. CMS — Testimonials Module (`/cms/testimonials`)

### 5.1 Page Structure (Table Mode)

```
┌─────────────────────────────────────────────────────────────────┐
│ PageHeader: "Testimonials"              [+ Add] [📥 Import CSV] │
├─────────────────────────────────────────────────────────────────┤
│ [📊 Table] [📋 Kanban]  [Status ▾] [Tags ▾] [Rating ▾] [🔍]    │
├─────┬──────────┬───────────────┬──────┬────────┬─────┬─────┬───┤
│  ☐  │ Author   │ Message       │ ★    │ Status │ Src │ Date│ ⋯ │
├─────┼──────────┼───────────────┼──────┼────────┼─────┼─────┼───┤
│  ☐  │👤 Ada    │"This tool..." │★★★★★ │● Appr  │📝   │Jan 9│ ⋯ │
│  ☐  │👤 Ben    │"Amazing..."  │★★★★  │● Pend  │🐦   │Jan 8│ ⋯ │
│  ☐  │👤 Cara   │"Saved us..." │★★★★★ │● Appr  │🔗   │Jan 7│ ⋯ │
│  ☐  │👤 Dan    │"Buy now..."  │★     │● Rej   │📝   │Jan 6│ ⋯ │
├─────┴──────────┴───────────────┴──────┴────────┴─────┴─────┴───┤
│ [Bulk: 2 selected → ✓ Approve | ✗ Reject | 🏷 Tag | 📦 Archive]│
├─────────────────────────────────────────────────────────────────┤
│ ← 1 2 3 ... 8 →          20 per page     142 total             │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Components

```
cms/testimonials/
├── page.tsx
├── [testimonialId]/
│   └── page.tsx                         # Full detail/edit view
└── components/
    ├── TestimonialToolbar.tsx            # View toggle + filters + search + actions
    ├── TestimonialFilters.tsx            # Status multi, tags multi, rating range, source, date
    ├── TestimonialSearchBar.tsx          # Debounced full-text search
    ├── TestimonialTable.tsx              # TanStack Table
    ├── TestimonialRow.tsx                # Single row with inline actions
    ├── TestimonialKanban.tsx             # dnd-kit board: Pending | Approved | Rejected | Archived
    ├── TestimonialKanbanCard.tsx         # Card: avatar, name, message, rating, source
    ├── TestimonialDetailDrawer.tsx       # Side sheet: full view + edit + approve/reject
    ├── TestimonialEditForm.tsx           # React Hook Form: all fields
    ├── TestimonialApproveButton.tsx      # Single-click approve with optimistic update
    ├── TestimonialRejectDialog.tsx       # Reject with reason input
    ├── BulkActionBar.tsx                 # Floating bar for bulk actions
    ├── CreateTestimonialDialog.tsx       # Manual creation form
    ├── ImportCsvDialog.tsx              # 3-step: Upload → Map Columns → Preview → Import
    ├── ImportCsvMapper.tsx              # Drag CSV headers to testimonial fields
    ├── ImportCsvPreview.tsx             # First 5 rows preview with validation warnings
    ├── TestimonialStatusBadge.tsx        # Color-coded status pill
    ├── TestimonialSourceBadge.tsx        # Icon + label for source
    ├── TestimonialRatingDisplay.tsx      # Star/NPS/Thumbs display
    └── TestimonialEmptyState.tsx         # "No testimonials yet" + CTA
```

### 5.3 States

| State | UI |
|---|---|
| Loading | Table skeleton (5 rows shimmering) |
| Empty | `TestimonialEmptyState`: "No testimonials yet" + "Create your first" + "Set up a collection form" + "Import CSV" |
| Empty (filtered) | "No testimonials match your filters" + "Clear all filters" |
| Loaded (table) | Paginated table with sortable columns |
| Loaded (kanban) | 4-column board with draggable cards |
| Bulk selection | Floating action bar appears at bottom |
| Detail open | Side drawer slides in from right |
| Approving | Optimistic: badge turns green instantly, spinner on button, toast on success |
| Rejecting | Dialog with reason input → confirm → badge turns red |
| Importing CSV | Progress bar in dialog → job status polling → completion summary |

---

## 6. CMS — Forms Module (`/cms/forms`)

### 6.1 Page Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ PageHeader: "Collection Forms"                    [+ New Form]  │
├────────┬────────┬────────┬──────────────────────────────────────┤
│┌──────┐│┌──────┐│┌──────┐│                                      │
││ 📝   │││ 📝   │││ 📝   ││                                      │
││Custo-│││Quick │││Video ││                                      │
││mer FB│││Review│││Testi-││                                      │
││      │││      │││monial││                                      │
││● Act │││● Draft││● Act ││                                      │
││47 sub│││0 sub │││12 sub││                                      │
││[Edit]│││[Edit]│││[Edit]││                                      │
││[🔗]  │││[🔗]  │││[🔗]  ││                                      │
││[📱QR]│││[📱QR]│││[📱QR]││                                      │
│└──────┘│└──────┘│└──────┘│                                      │
└────────┴────────┴────────┴──────────────────────────────────────┘
```

### 6.2 Components

```
cms/forms/
├── page.tsx
├── [formId]/
│   ├── page.tsx                          # Form builder
│   └── submissions/
│       └── page.tsx                      # Submission log table
└── components/
    ├── FormCardGrid.tsx
    ├── FormCard.tsx                       # Name, status, submission count, template
    ├── FormBuilder.tsx                    # Split: config left, preview right
    ├── FormTemplatePicker.tsx             # Template gallery (4 templates)
    ├── FormQuestionEditor.tsx             # Add/remove/reorder questions
    ├── FormQuestionItem.tsx               # Single question: type, label, required, options
    ├── FormSettingsPanel.tsx              # Rating type, video, consent, redirect
    ├── FormStylePanel.tsx                 # Colors, fonts (bound to template configSchema)
    ├── FormPreviewPane.tsx                # Live iframe preview
    ├── FormPublishControls.tsx            # Draft/Active/Paused toggle
    ├── FormSharePanel.tsx                 # Public URL, embed code, QR code
    ├── FormQrCode.tsx                     # Downloadable QR
    ├── FormEmbedCodeModal.tsx             # Tabs: iframe, modal, direct link
    ├── SubmissionLogTable.tsx             # Table of raw submissions
    └── SubmissionDetailDrawer.tsx         # Full submission view
```

---

## 7. CMS — Widgets Module (`/cms/widgets`)

### 7.1 Components

```
cms/widgets/
├── page.tsx
├── [widgetId]/
│   └── page.tsx                          # Widget config + link to Visual Editor
└── components/
    ├── WidgetCardGrid.tsx
    ├── WidgetCard.tsx                     # Name, layout type, template, published status
    ├── WidgetConfigPanel.tsx              # Filter settings, data source
    ├── WidgetDesignLink.tsx               # "Edit Design in Visual Editor" button → /designs/[designId]
    ├── WidgetEmbedPanel.tsx               # Script, iframe, React tabs with copy
    ├── WidgetLivePreview.tsx              # Embedded widget preview using widget.js
    └── WidgetPublishToggle.tsx            # Publish/unpublish switch
```

---

## 8. CMS — Media Library (`/cms/media`)

### 8.1 Page Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ PageHeader: "Media Library"                    [+ Upload Files] │
├─────────────────────────────────────────────────────────────────┤
│ [All] [Images] [Videos]   [🔍 Search...]   Sort: [Newest ▾]    │
├──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬───────┤
│┌────┐│┌────┐│┌────┐│┌────┐│┌────┐│┌────┐│┌────┐│┌────┐│       │
││ 🖼 │││ 🖼 │││ 🎥 │││ 🖼 │││ 🖼 │││ 🖼 │││ 🎥 │││ 🖼 ││       │
││    │││    │││ ▶  │││    │││    │││    │││ ▶  │││    ││       │
││45KB│││120K│││2.1M│││89KB│││34KB│││67KB│││5.4M│││23KB││       │
│└────┘│└────┘│└────┘│└────┘│└────┘│└────┘│└────┘│└────┘│       │
└──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴───────┘
```

### 8.2 Components

```
cms/media/
├── page.tsx
└── components/
    ├── MediaGrid.tsx                      # Responsive thumbnail grid
    ├── MediaItem.tsx                      # Thumbnail + size + type badge
    ├── MediaUploadZone.tsx                # Drag-and-drop upload area
    ├── MediaUploadProgress.tsx            # Per-file progress bars
    ├── MediaDetailDrawer.tsx              # Full preview + metadata + alt text + tags
    ├── MediaFilters.tsx                   # Type, search, sort
    ├── MediaDeleteDialog.tsx              # Confirm delete with usage warning
    └── MediaEmptyState.tsx                # "No media yet" + upload CTA
```

---

## 9. CMS — Analytics (`/cms/analytics`)

### 9.1 Components

```
cms/analytics/
├── page.tsx
└── components/
    ├── AnalyticsOverview.tsx              # 4 stat cards: Total, Approved, Pending, Avg Rating
    ├── TestimonialsOverTimeChart.tsx      # Recharts LineChart
    ├── SourceBreakdownChart.tsx           # Recharts PieChart
    ├── RatingDistributionChart.tsx        # Recharts BarChart
    ├── ConversionFunnelChart.tsx          # Form views → submissions → approvals
    ├── TopTestimonialsList.tsx            # Most featured / highest rated
    ├── AnalyticsPeriodSelector.tsx        # 7d / 30d / 90d / 1y / custom
    └── AnalyticsEmptyState.tsx            # "Not enough data yet"
```

---

## 10. Template Marketplace (`/templates`)

### 10.1 Browse Page

```
┌─────────────────────────────────────────────────────────────────┐
│ PageHeader: "Template Marketplace"                              │
├─────────────────────────────────────────────────────────────────┤
│ [🌍 Global Gallery] [📁 My Templates] [📱 My App Designs]       │
├─────────────────────────────────────────────────────────────────┤
│ [All ▾] [Carousels] [Grids] [Spotlights] [Forms] [Free ▾] [🔍]│
├────────┬────────┬────────┬──────────────────────────────────────┤
│┌──────┐│┌──────┐│┌──────┐│                                      │
││ 🎠   │││ 🧱   │││ ⭐   ││                                      │
││Modern│││Wall  │││Spot- ││                                      │
││Carou-│││of    │││light ││                                      │
││sel   │││Love  │││      ││                                      │
││      │││      │││      ││                                      │
││Free  │││Pro ★ │││Free  ││                                      │
││👁 234 │││👁 189 │││👁 156 ││                                      │
││[Use] │││[Use] │││[Use] ││                                      │
│└──────┘│└──────┘│└──────┘│                                      │
└────────┴────────┴────────┴──────────────────────────────────────┘
```

### 10.2 Components

```
templates/
├── page.tsx                              # Browse gallery
├── [templateId]/
│   └── page.tsx                          # Preview + clone
├── my/
│   └── page.tsx                          # Tenant's own templates
└── components/
    ├── TemplateGallery.tsx                # Responsive grid
    ├── TemplateCard.tsx                   # Thumbnail, name, category, premium badge, use count
    ├── TemplatePreviewModal.tsx           # Full-size preview with live data
    ├── TemplateCloneButton.tsx            # "Use This Template" → clones to tenant
    ├── TemplateFilters.tsx                # Category, type, premium, search
    ├── TemplateCategoryNav.tsx            # Horizontal category pills
    ├── TemplateDetailHeader.tsx           # Name, description, author, version, rating
    ├── TemplateLivePreview.tsx            # Embedded widget preview with tenant's data
    ├── TemplateVersionSelector.tsx        # Version dropdown (for global templates)
    ├── MyTemplatesList.tsx                # Tenant's templates with edit/delete/promote
    ├── PromoteToGlobalDialog.tsx          # Submit tenant template for global review
    └── TemplateEmptyState.tsx             # "No templates in this category"
```

### 10.3 States

| State | UI |
|---|---|
| Loading | 6 skeleton cards |
| Empty (global) | "No templates available yet" (rare — platform seeds defaults) |
| Empty (my) | "You haven't created any templates" + "Save a design as template" CTA |
| Clone in progress | Button spinner → toast "Template cloned" → redirect to editor |
| Premium gated | "Upgrade to Pro to use this template" + upgrade CTA |

---

## 11. No-Code Builder (`/builder`)

### 11.1 Wizard Flow

```
STEP 1: Choose Template          STEP 2: Configure Content
┌──────────────────────┐        ┌──────────────────────┐
│ Pick a starting      │        │ What to show:         │
│ design:              │        │                       │
│ ┌────┐ ┌────┐ ┌────┐│        │ Tags: [onboarding ▾]  │
│ │ 🎠 │ │ 🧱 │ │ ⭐ ││        │ Min Rating: [4 ★]     │
│ │    │ │    │ │    ││        │ Source: [All ▾]       │
│ └────┘ └────┘ └────┘│        │ Count: [━━●━] 10      │
│ ┌────┐ ┌────┐ ┌────┐│        │ Sort: [Newest ▾]      │
│ │ 🎥 │ │ 🔄 │ │ 📝 ││        │                       │
│ │    │ │    │ │    ││        │ [Live preview updates  │
│ └────┘ └────┘ └────┘│        │  as you change filters]│
│                      │        │                       │
│ [Next →]             │        │ [← Back] [Next →]     │
└──────────────────────┘        └──────────────────────┘

STEP 3: Customize Look           STEP 4: Get Embed Code
┌──────────────────────┐        ┌──────────────────────┐
│ Brand color:         │        │ Your widget is ready! │
│ [■ #4F46E5]         │        │                       │
│                      │        │ ┌──────────────────┐  │
│ Font: [Inter ▾]     │        │ │ [Live Preview]    │  │
│                      │        │ └──────────────────┘  │
│ Card style:          │        │                       │
│ ○ Rounded            │        │ Embed code:           │
│ ● Sharp              │        │ [Script] [iframe]     │
│ ○ Bordered           │        │ [React] [WordPress]   │
│                      │        │                       │
│ Density:             │        │ <script src="..."     │
│ ○ Compact            │        │   data-app="app_xxx"  │
│ ● Comfortable        │        │   data-widget="..."   │
│ ○ Spacious           │        │ ></script>            │
│                      │        │ [📋 Copy]             │
│ [← Back] [Next →]    │        │                       │
└──────────────────────┘        │ [Edit in Full Editor] │
                                │ [← Back] [Done ✓]     │
                                └──────────────────────┘
```

### 11.2 Components

```
builder/
├── page.tsx                              # Wizard shell with step indicator
└── components/
    ├── BuilderWizard.tsx                  # Step navigation + progress bar
    ├── BuilderStepIndicator.tsx           # 1-2-3-4 dots with labels
    ├── Step1TemplatePicker.tsx            # Template gallery (curated subset)
    ├── Step2ContentConfig.tsx             # Filters, count, sort
    ├── Step3StyleConfig.tsx              # Color, font, card style, density
    ├── Step4EmbedCode.tsx                # Embed code tabs + copy + QR
    ├── BuilderLivePreview.tsx             # Real-time preview panel (right side)
    └── BuilderSaveDialog.tsx              # Name the widget + assign to app
```

### 11.3 Data Flow

```
1. User picks template → loads DesignSchema from DB
2. User configures filters → updates widget.filter in memory
3. User customizes style → updates DesignSchema.style overrides in memory
4. User clicks "Done" → 
   a. POST /v1/dashboard/designs (saves the DesignSchema)
   b. POST /v1/dashboard/widgets (creates widget linked to design)
   c. Shows embed code
5. "Edit in Full Editor" → redirects to /designs/[designId]
```

---

## 12. AI Design Generator (`/ai`)

### 12.1 Page Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ PageHeader: "AI Design Generator"              [✨ New Design]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Describe the testimonial widget you want:                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ "A dark-themed circular carousel with gold star ratings,  │   │
│  │  rounded cards, and a fade-in animation. Show author      │   │
│  │  photos in a circle. Hover to reveal the full quote."     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Brand color: [■ #FF5733]   Layout: [Carousel ▾]               │
│  Style: [Modern ▾]          Testimonials: [5]                   │
│                                                                  │
│  [✨ Generate Design]  [🎲 Surprise Me]                          │
│                                                                  │
│  ─── Generated Preview ───                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ┌──────┐  ┌──────┐  ┌──────┐                           │   │
│  │  │ 👤   │  │ 👤   │  │ 👤   │   ← Live preview           │   │
│  │  │ ★★★★★ │  │ ★★★★  │  │ ★★★★★ │      with real data       │   │
│  │  │"Great │  │"Nice │  │"Love │                           │   │
│  │  └──────┘  └──────┘  └──────┘                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [Edit in Visual Editor]  [Save as Template]  [Use Now]          │
│  [🔄 Regenerate]  [Refine: "Make the cards bigger and add blur"] │
│                                                                  │
│  ─── Generation History ───                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Jan 15: "Dark carousel..." → ✅ Saved as "Night Carousel" │   │
│  │ Jan 14: "Minimal grid..." → ✅ Using on Marketing Site    │   │
│  │ Jan 12: "Video wall..." → ❌ Regenerated                  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 12.2 Components

```
ai/
├── page.tsx
└── components/
    ├── AiPromptInput.tsx                  # Large textarea with character count
    ├── AiParameterPanel.tsx               # Brand color, layout, style, count
    ├── AiGenerateButton.tsx               # Primary CTA with loading state
    ├── AiSurpriseButton.tsx               # Random prompt generator
    ├── AiPreviewPanel.tsx                 # Live preview of generated design
    ├── AiActionBar.tsx                    # Edit, Save, Use, Regenerate, Refine
    ├── AiRefineInput.tsx                  # Follow-up prompt input
    ├── AiHistoryList.tsx                  # Past generations
    ├── AiHistoryItem.tsx                  # Single history entry
    ├── AiLoadingState.tsx                 # "Generating your design..." with shimmer animation
    ├── AiErrorState.tsx                   # "Couldn't generate. Try a different description."
    └── AiEmptyState.tsx                   # "Describe what you want and AI will create it"
```

### 12.3 States

| State | UI |
|---|---|
| Empty | Prompt input + "Surprise Me" button + example prompts |
| Generating | Shimmer animation on preview area + "Generating your design..." + progress dots |
| Generated | Live preview + action buttons + refine input |
| Refining | "Applying changes..." spinner on preview |
| Error | Error message + "Try again" + "Use a simpler description" hint |
| History | List of past generations with status badges |

---

## 13. Platform Dashboard — Template Management

### 13.1 Global Template Management (`/templates/marketplace`)

```
platform-dashboard/app/(dashboard)/templates/marketplace/
├── page.tsx
└── components/
    ├── GlobalTemplateGrid.tsx             # All global templates
    ├── GlobalTemplateCard.tsx             # With edit/delete/feature controls
    ├── CreateGlobalTemplateButton.tsx     # Opens editor with tenantId=null
    ├── TemplateFeatureToggle.tsx          # Mark as featured
    ├── TemplatePremiumToggle.tsx          # Mark as premium
    └── TemplateStatusBadge.tsx            # Active / Deprecated
```

### 13.2 Review Queue (`/templates/marketplace/review`)

```
platform-dashboard/app/(dashboard)/templates/marketplace/review/
├── page.tsx
└── components/
    ├── ReviewQueueTable.tsx               # Submitted templates awaiting review
    ├── ReviewPreviewPanel.tsx             # Live preview of submitted template
    ├── ApproveTemplateButton.tsx          # Approve → moves to global gallery
    └── RejectTemplateDialog.tsx           # Reject with reason → notifies tenant
```

---

## 14. Shared UI Patterns Across All Pages

### 14.1 Every List Page Must Have

| State | Component | Required |
|---|---|---|
| Loading | Skeleton grid/table | ✅ |
| Empty (no data) | EmptyState with CTA | ✅ |
| Empty (filtered) | EmptyState + "Clear filters" | ✅ |
| Loaded | Data grid/table/cards | ✅ |
| Error | Alert + Retry button | ✅ |
| Paginated | Pagination controls | ✅ (if >20 items) |

### 14.2 Every Detail/Edit Page Must Have

| State | Component | Required |
|---|---|---|
| Loading | Full-page skeleton | ✅ |
| Loaded | Edit form / detail view | ✅ |
| Saving | Button spinner + disabled | ✅ |
| Saved | Toast success | ✅ |
| Error | Alert + Retry | ✅ |
| Not found | 404 page + Back link | ✅ |
| Unsaved changes | Navigation warning | ✅ |

### 14.3 Every Dialog Must Have

| Element | Required |
|---|---|
| Title | ✅ |
| Description | ✅ |
| Cancel button | ✅ |
| Confirm button with loading state | ✅ |
| Escape key to close | ✅ |
| Click overlay to close | ✅ |
| Focus trap | ✅ |
| Destructive variant (red confirm, type-to-confirm) | ✅ for delete operations |

---

## 15. File Structure Summary

```
apps/tenant-dashboard/app/(dashboard)/
├── designs/
│   ├── page.tsx
│   ├── new/page.tsx
│   ├── [designId]/
│   │   ├── page.tsx
│   │   └── preview/page.tsx
│   └── components/ (40+ files as listed in §3.2)
├── cms/
│   ├── testimonials/
│   │   ├── page.tsx
│   │   ├── [testimonialId]/page.tsx
│   │   └── components/ (20+ files)
│   ├── forms/
│   │   ├── page.tsx
│   │   ├── [formId]/page.tsx
│   │   ├── [formId]/submissions/page.tsx
│   │   └── components/ (16+ files)
│   ├── widgets/
│   │   ├── page.tsx
│   │   ├── [widgetId]/page.tsx
│   │   └── components/ (8+ files)
│   ├── media/
│   │   ├── page.tsx
│   │   └── components/ (8+ files)
│   └── analytics/
│       ├── page.tsx
│       └── components/ (8+ files)
├── templates/
│   ├── page.tsx
│   ├── [templateId]/page.tsx
│   ├── my/page.tsx
│   └── components/ (12+ files)
├── builder/
│   ├── page.tsx
│   └── components/ (8+ files)
└── ai/
    ├── page.tsx
    └── components/ (10+ files)

apps/platform-dashboard/app/(dashboard)/templates/
├── marketplace/
│   ├── page.tsx
│   ├── review/page.tsx
│   └── components/ (6+ files)
└── create/page.tsx
```

**Total new component files for Doc 7C: ~150+**

---

# ✅ DOC 7C — REQUIREMENTS CHECKLIST & DEFINITION OF DONE

## A. Page Existence Checks

- [ ] All pages listed in §0's inventory exist as `page.tsx` files in the correct App Router directories — verified by `next build` succeeding with zero missing route errors
- [ ] All component files listed in §§3.2, 5.2, 6.2, 7.1, 8.2, 9.1, 10.2, 11.2, 12.2, 13.1, 13.2 exist as separate `.tsx` files — verified by file count
- [ ] Every page has a corresponding loading state (skeleton), empty state, error state, and loaded state — verified by manually triggering each state

## B. Visual Editor Checks

- [ ] Editor loads a design from the database and renders all elements on the canvas — verified
- [ ] Left panel shows Elements, Layers, Media, Templates tabs — verified
- [ ] Right panel shows Properties, Animation, Data, Responsive tabs — verified
- [ ] Timeline panel opens/collapses at the bottom — verified
- [ ] Top bar shows design name (editable), version, dirty indicator, undo/redo, preview, save, publish — verified
- [ ] Status bar shows element count, selection count, zoom level, viewport size — verified
- [ ] Preview mode hides panels and renders with real data — verified
- [ ] Code view shows raw JSON in Monaco editor — verified
- [ ] Context menu (right-click) shows Copy, Paste, Delete, Duplicate, Lock, Bring to Front — verified
- [ ] Keyboard shortcuts work: Ctrl+Z, Ctrl+S, Delete, Escape — verified
- [ ] Unsaved changes warning appears on navigation — verified

## C. CMS Module Checks

- [ ] Testimonials page: table view, kanban view, filters, search, bulk actions, import CSV — all functional
- [ ] Forms page: create, edit, publish, preview, embed code, QR code, submission log — all functional
- [ ] Widgets page: create, link to design editor, embed code, publish toggle — all functional
- [ ] Media page: upload, preview, delete, search, filter by type — all functional
- [ ] Analytics page: all 4 charts render with real data from `app_stats` — all functional

## D. Template Marketplace Checks

- [ ] Global templates appear in all tenants' galleries — verified
- [ ] Clone creates a tenant-owned copy — verified
- [ ] Premium templates show upgrade CTA for free tenants — verified
- [ ] "My Templates" shows tenant's own templates — verified
- [ ] Platform review queue shows submitted templates with approve/reject — verified

## E. No-Code Builder Checks

- [ ] 4-step wizard completes end-to-end: template → content → style → embed — verified
- [ ] Live preview updates in real time as user changes options — verified
- [ ] "Done" saves design + widget to database — verified
- [ ] "Edit in Full Editor" redirects to the Visual Editor with the correct design loaded — verified
- [ ] Embed code is correct and functional when pasted into a test HTML page — verified

## F. AI Generator Checks

- [ ] Prompt input accepts text and generates a design — verified (when AI backend is connected)
- [ ] Loading state shows during generation — verified
- [ ] Generated preview renders correctly — verified
- [ ] "Edit in Visual Editor" opens the generated design — verified
- [ ] "Refine" sends follow-up prompt and updates the design — verified
- [ ] History list shows past generations — verified
- [ ] Error state handles AI failures gracefully — verified

## G. Accessibility Checks

- [ ] All pages are keyboard-navigable — verified by tabbing through every interactive element
- [ ] All dialogs have focus traps — verified
- [ ] All form inputs have labels — verified
- [ ] All images have alt text — verified
- [ ] Color contrast meets WCAG AA — verified via Lighthouse

## H. Sign-Off Gate

Doc 7C is only complete when:

1. A QA tester can complete every critical flow end-to-end: create design → edit in Visual Editor → save → publish → see in widget embed; create form → share link → submit testimonial → approve in CMS → see in widget; browse templates → clone → customize → publish; use no-code builder → get embed code → paste into website; generate AI design → refine → save.
2. Every page has all four states implemented (loading, empty, error, loaded) — no blank screens, no unhandled errors.
3. The Visual Editor renders the circular carousel example from Doc 7A correctly with all interactive features (selection, resize, drag, snap, animation, data binding, responsive).
4. CI is green on: TypeScript compilation, component tests, E2E tests (Playwright) for critical flows, Lighthouse accessibility ≥95.
5. This checklist is fully checked and attached to the milestone PR.

**A page that works but has no empty state is not done. A page that shows data but has no loading state is not done. Every state must be designed, built, and tested.**

---

Say **"Doc 7D"** and I'll deliver the Gallery — template curation flows, global→tenant→app distribution, clone/merge mechanics, CDN distribution architecture, npm package publishing, responsive rendering in the widget runtime, and the full embed lifecycle from script tag to rendered pixel.
```
