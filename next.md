DOC 7 — THE CREATIVE STUDIO (Split into 5 Parts)
You're right — this is too large for a single document. Here's the breakdown:

Doc	Metaphor	Contents
7A	🦴 Blueprint	Design Schema format, database tables, repository interfaces, API contracts, widget runtime architecture
7B	🫀 Engine	Visual Editor state management, rendering pipeline, animation engine, data binding, undo/redo, snap/grid system
7C	🧍 Canvas	Editor UI layout, CMS modules, template marketplace UI, no-code builder, AI generator UI — all pages & components
7D	💇 Gallery	Template curation, global→tenant→app flows, clone/merge, CDN distribution, npm packages, responsive rendering
7E	🛡️ Shield	Schema validation, XSS in user designs, SSRF in media, template injection, load testing, CI/CD for the studio
DOC 7A — THE BLUEPRINT
Design Schema, Database, API Contracts & Runtime Architecture
0. What This Document Defines
This is the structural foundation of the entire Creative Studio. Before any editor is built, any pixel is pushed, or any animation is rendered, we need to agree on the universal data format that every tool in the system produces and consumes. That format is the DesignSchema.

Everything in this document is storage-agnostic at the domain layer and PostgreSQL-first at the infrastructure layer, consistent with the Doc 1 skeleton.

1. The DesignSchema — Universal Format
1.1 Why a Single Schema?
The platform has three ways to create a design:

Full Visual Editor (drag-and-drop canvas)
No-Code Builder (4-step wizard)
AI Generator (text prompt → design)
All three must produce the exact same output format so that:

The widget runtime only needs one renderer
Templates are interchangeable regardless of how they were created
A design created in the wizard can be opened in the full editor later
Everything saves to the same database table
Versioning, cloning, and rollback work uniformly
1.2 Full TypeScript Definition
TypeScript

// packages/shared-types/design-schema.types.ts

// ── ROOT SCHEMA ──────────────────────────────────────────────
export interface DesignSchema {
  id: string;                      // "dsgn_abc123def456"
  publicId: string;                // same, used in API/URLs
  version: number;                 // incremented on every save
  name: string;                    // human label
  description: string | null;
  type: DesignType;

  canvas: CanvasConfig;
  elements: DesignElement[];       // root-level element tree
  animations: GlobalAnimation[];   // reusable animation definitions
  breakpoints: BreakpointOverrides;
  dataBindings: DataBinding[];     // schema-level binding declarations
  fonts: FontDeclaration[];        // custom fonts used in the design
  theme: ThemeTokens;              // design-local color/spacing tokens

  // Metadata (stored in DB, not rendered)
  metadata: DesignMetadata;
}

export type DesignType = 'widget' | 'form' | 'section' | 'page' | 'badge' | 'popup';

// ── CANVAS ───────────────────────────────────────────────────
export interface CanvasConfig {
  width: Dimension;
  height: Dimension;
  minWidth: number | null;
  maxWidth: number | null;
  backgroundColor: ColorValue;
  backgroundImage: ImageValue | null;
  overflow: 'hidden' | 'visible' | 'scroll' | 'auto';
  padding: Spacing;
  borderRadius: BorderRadius;
  cursor: 'default' | 'pointer' | 'grab';
}

// ── ELEMENTS (recursive tree) ────────────────────────────────
export interface DesignElement {
  id: string;                      // unique within the design, e.g. "el_a1b2c3"
  type: ElementType;
  name: string;                    // human label for layers panel, e.g. "Author Avatar"
  locked: boolean;
  visible: boolean;

  // Layout
  layout: LayoutConfig;

  // Visual
  style: StyleConfig;

  // Content
  content: ContentConfig | null;

  // Typography (only for text-bearing elements)
  typography: TypographyConfig | null;

  // Interaction
  interaction: InteractionConfig | null;

  // Animation
  animation: ElementAnimation | null;

  // Data binding
  dataBinding: DataBindingRef | null;

  // Conditions
  conditions: ConditionConfig | null;

  // Children (for container-type elements)
  children: DesignElement[];
}

// ── ELEMENT TYPES ────────────────────────────────────────────
export type ElementType =
  // Layout containers
  | 'container'
  | 'flex-row'
  | 'flex-column'
  | 'grid'
  | 'stack'                // overlapping layers (position: absolute children)

  // Dynamic layouts (data-driven, repeat per testimonial)
  | 'carousel'
  | 'circular-carousel'
  | 'marquee'
  | 'masonry'
  | 'accordion'
  | 'tabs'

  // Content elements
  | 'text'
  | 'heading'
  | 'rich-text'            // sanitized HTML (premium only)
  | 'image'
  | 'avatar'
  | 'video'
  | 'icon'
  | 'lottie'               // Lottie animation (URL reference)

  // Testimonial-specific composites
  | 'rating-stars'
  | 'rating-nps'
  | 'rating-thumbs'
  | 'testimonial-card'     // pre-built composite: avatar + name + title + stars + message
  | 'testimonial-wall'     // masonry grid of cards

  // UI elements
  | 'button'
  | 'badge'
  | 'divider'
  | 'spacer'
  | 'progress-bar'

  // Effects / overlays
  | 'blur-overlay'
  | 'gradient-overlay'
  | 'shape'                // circle, rectangle, blob, triangle

  // Form elements (for collection forms)
  | 'form-field'
  | 'form-submit'
  | 'form-consent'

  // Advanced
  | 'custom-component';    // reference to a registered component by name

// ── LAYOUT ───────────────────────────────────────────────────
export interface LayoutConfig {
  position: 'flow' | 'absolute' | 'sticky';
  x: number | null;               // px from parent left (absolute only)
  y: number | null;               // px from parent top (absolute only)
  width: Dimension;
  height: Dimension;
  minWidth: Dimension | null;
  maxWidth: Dimension | null;
  minHeight: Dimension | null;
  maxHeight: Dimension | null;
  margin: Spacing;
  padding: Spacing;
  zIndex: number;
  alignSelf: 'auto' | 'start' | 'center' | 'end' | 'stretch';

  // Flex children
  flexGrow: number;
  flexShrink: number;
  flexBasis: Dimension | null;

  // Grid children
  gridColumn: string | null;      // e.g. "1 / 3"
  gridRow: string | null;

  // Grid container
  gridTemplateColumns: string | null;  // e.g. "repeat(3, 1fr)"
  gridTemplateRows: string | null;
  gridGap: number;

  // Carousel config (only for carousel types)
  carouselConfig: CarouselConfig | null;
}

export interface CarouselConfig {
  direction: 'horizontal' | 'vertical' | 'circular';
  autoPlay: boolean;
  autoPlayInterval: number;       // ms
  pauseOnHover: boolean;
  loop: boolean;
  itemsPerView: number | 'auto';
  gap: number;
  navigation: 'arrows' | 'dots' | 'both' | 'none';
  speed: number;                  // transition duration ms
  easing: string;
}

// ── STYLE ────────────────────────────────────────────────────
export interface StyleConfig {
  backgroundColor: ColorValue;
  backgroundImage: ImageValue | null;
  backgroundSize: 'cover' | 'contain' | 'auto';
  backgroundPosition: string;     // e.g. "center center"
  borderRadius: BorderRadius;
  border: BorderConfig;
  boxShadow: ShadowConfig[];      // multiple shadows supported
  opacity: number;                // 0-1
  filter: FilterConfig;
  transform: TransformConfig;
  overflow: 'hidden' | 'visible' | 'scroll' | 'auto';
  cursor: 'default' | 'pointer' | 'grab' | 'text';
}

export interface BorderConfig {
  top: BorderSide;
  right: BorderSide;
  bottom: BorderSide;
  left: BorderSide;
}

export interface BorderSide {
  width: number;
  color: ColorValue;
  style: 'solid' | 'dashed' | 'dotted' | 'none';
}

export interface ShadowConfig {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: ColorValue;
  inset: boolean;
}

export interface FilterConfig {
  blur: number;                   // px
  brightness: number;             // 0-2, 1 = normal
  contrast: number;               // 0-2
  saturate: number;               // 0-2
  grayscale: number;              // 0-1
  hueRotate: number;              // degrees
  backdropBlur: number;           // px (frosted glass)
  backdropBrightness: number;
  backdropSaturate: number;
}

export interface TransformConfig {
  rotate: number;                 // degrees
  scaleX: number;
  scaleY: number;
  skewX: number;                  // degrees
  skewY: number;
  translateX: number;             // px
  translateY: number;
  perspective: number | null;
}

// ── CONTENT ──────────────────────────────────────────────────
export interface ContentConfig {
  text: string | null;            // static or "{{binding.key}}"
  html: string | null;            // sanitized rich text (premium)
  image: ImageValue | null;
  video: VideoValue | null;
  icon: string | null;            // Lucide icon name
  lottieUrl: string | null;       // URL to .json Lottie file
  altText: string | null;
}

// ── TYPOGRAPHY ───────────────────────────────────────────────
export interface TypographyConfig {
  fontFamily: string;
  fontSize: number;               // px
  fontWeight: number;             // 100-900
  fontStyle: 'normal' | 'italic';
  lineHeight: number;             // multiplier (1.5 = 150%)
  letterSpacing: number;          // em
  color: ColorValue;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  textDecoration: 'none' | 'underline' | 'line-through' | 'overline';
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textOverflow: 'clip' | 'ellipsis';
  maxLines: number | null;        // truncate after N lines
  whiteSpace: 'normal' | 'nowrap' | 'pre-wrap';
}

// ── INTERACTION ──────────────────────────────────────────────
export interface InteractionConfig {
  hover: Partial<StyleConfig & TransformConfig> | null;
  active: Partial<StyleConfig & TransformConfig> | null;
  focus: Partial<StyleConfig & TransformConfig> | null;
  click: ClickAction | null;
  tooltip: string | null;
  transition: TransitionConfig | null;
}

export interface ClickAction {
  type: 'navigate' | 'open-modal' | 'expand' | 'play-video' | 'submit-form' | 'scroll-to' | 'custom';
  target: string;                 // URL, element ID, or custom handler name
  newTab: boolean;
}

export interface TransitionConfig {
  property: string;               // "all", "transform", "opacity", etc.
  duration: number;               // ms
  easing: string;                 // CSS easing
  delay: number;                  // ms
}

// ── ANIMATION ────────────────────────────────────────────────
export interface ElementAnimation {
  type: AnimationType;
  duration: number;               // ms
  delay: number;                  // ms
  easing: string;
  iterationCount: number | 'infinite';
  direction: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fillMode: 'none' | 'forwards' | 'backwards' | 'both';
  trigger: AnimationTrigger;
  keyframes: Keyframe[] | null;   // null = use preset, array = custom
}

export type AnimationType =
  | 'fade-in' | 'fade-out'
  | 'fade-in-up' | 'fade-in-down' | 'fade-in-left' | 'fade-in-right'
  | 'slide-in-up' | 'slide-in-down' | 'slide-in-left' | 'slide-in-right'
  | 'scale-in' | 'scale-out'
  | 'rotate-in' | 'rotate-out'
  | 'blur-in' | 'blur-out'
  | 'flip-x' | 'flip-y'
  | 'bounce-in'
  | 'typewriter'
  | 'float' | 'pulse' | 'shimmer' | 'glow'
  | 'orbit'                        // circular carousel motion
  | 'marquee-scroll'               // infinite horizontal scroll
  | 'stagger-children'             // animate children sequentially
  | 'custom';

export type AnimationTrigger =
  | 'on-load'
  | 'on-scroll-into-view'
  | 'on-hover'
  | 'on-click'
  | 'on-carousel-active'
  | 'continuous';

export interface Keyframe {
  offset: number;                 // 0.0 - 1.0
  style: Partial<StyleConfig & TransformConfig & { opacity: number }>;
}

export interface GlobalAnimation {
  id: string;
  name: string;
  keyframes: Keyframe[];
  duration: number;
  easing: string;
  iterationCount: number | 'infinite';
}

// ── DATA BINDING ─────────────────────────────────────────────
export interface DataBinding {
  key: string;                    // e.g. "testimonial.author.name"
  source: 'testimonial' | 'form' | 'tenant' | 'app' | 'static';
  path: string;                   // dot-notation path into the data object
  fallback: string;
  transform: DataTransform | null;
}

export interface DataBindingRef {
  bindingKey: string;             // references a DataBinding.key
  property: string;               // which element property to bind: "content.text", "content.image", "style.backgroundColor"
}

export type DataTransform =
  | { type: 'truncate'; maxLength: number }
  | { type: 'uppercase' }
  | { type: 'lowercase' }
  | { type: 'capitalize' }
  | { type: 'date'; format: string }
  | { type: 'number'; decimals: number }
  | { type: 'stripHtml' }
  | { type: 'custom'; expression: string };

// ── CONDITIONS ───────────────────────────────────────────────
export interface ConditionConfig {
  showIf: string | null;          // expression: "testimonial.rating >= 4"
  showOnHover: boolean;
  showOnScroll: boolean;
  showOnBreakpoint: ('mobile' | 'tablet' | 'desktop')[] | null;
  showWhenEmpty: boolean;         // show element when bound data is empty?
}

// ── BREAKPOINTS ──────────────────────────────────────────────
export interface BreakpointOverrides {
  mobile: ElementOverride[];      // < 640px
  tablet: ElementOverride[];      // 640px - 1024px
  desktop: ElementOverride[];     // > 1024px (usually the default, overrides are rare)
}

export interface ElementOverride {
  elementId: string;
  overrides: {
    layout?: Partial<LayoutConfig>;
    style?: Partial<StyleConfig>;
    typography?: Partial<TypographyConfig>;
    visible?: boolean;
  };
}

// ── THEME TOKENS ─────────────────────────────────────────────
export interface ThemeTokens {
  colors: Record<string, ColorValue>;   // e.g. { "accent": "#FF5733", "card-bg": "#FFFFFF" }
  spacing: Record<string, number>;      // e.g. { "sm": 8, "md": 16, "lg": 24 }
  fonts: Record<string, string>;        // e.g. { "heading": "Inter", "body": "system-ui" }
}

// ── FONTS ────────────────────────────────────────────────────
export interface FontDeclaration {
  family: string;
  source: 'google' | 'system' | 'custom';
  url: string | null;             // for custom fonts, URL to .woff2
  weights: number[];
}

// ── VALUE TYPES ──────────────────────────────────────────────
export type Dimension = number | `${number}%` | `${number}vw` | `${number}vh` | 'auto' | 'fit-content';

export type ColorValue =
  | string                        // hex: "#FF5733", rgba: "rgba(255,87,51,0.5)"
  | { type: 'var'; name: string }  // CSS variable: var(--primary-500)
  | { type: 'gradient'; direction: string; stops: Array<{ color: string; position: number }> }
  | 'transparent';

export interface ImageValue {
  url: string;
  width: number | null;
  height: number | null;
  objectFit: 'cover' | 'contain' | 'fill' | 'none';
}

export interface VideoValue {
  url: string;
  poster: string | null;
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
  controls: boolean;
}

export interface Spacing {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface BorderRadius {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
}

// ── METADATA ─────────────────────────────────────────────────
export interface DesignMetadata {
  createdBy: string;              // userId
  tenantId: string | null;        // null = global (parent)
  appId: string | null;           // null = tenant-wide
  isTemplate: boolean;
  isPremium: boolean;
  isPublished: boolean;
  isAiGenerated: boolean;
  parentTemplateId: string | null;
  tags: string[];
  thumbnailUrl: string | null;
  category: string | null;        // 'carousel', 'grid', 'spotlight', etc.
  createdAt: string;              // ISO date
  updatedAt: string;
}
1.3 Example: Circular Avatar Carousel with Hover Reveal
JSON

{
  "id": "dsgn_circ_hover_001",
  "publicId": "dsgn_circ_hover_001",
  "version": 1,
  "name": "Circular Avatar Orbit with Hover Card",
  "description": "Author avatars orbit in a circle. Hovering an avatar pauses the orbit and reveals the full testimonial below.",
  "type": "widget",
  "canvas": {
    "width": "100%",
    "height": 480,
    "minWidth": 320,
    "maxWidth": 1200,
    "backgroundColor": "transparent",
    "backgroundImage": null,
    "overflow": "hidden",
    "padding": { "top": 24, "right": 24, "bottom": 24, "left": 24 },
    "borderRadius": { "topLeft": 0, "topRight": 0, "bottomRight": 0, "bottomLeft": 0 },
    "cursor": "default"
  },
  "elements": [
    {
      "id": "el_orbit",
      "type": "circular-carousel",
      "name": "Avatar Orbit",
      "locked": false,
      "visible": true,
      "layout": {
        "position": "flow",
        "x": null, "y": null,
        "width": "100%", "height": 280,
        "minWidth": null, "maxWidth": null,
        "minHeight": null, "maxHeight": null,
        "margin": { "top": 0, "right": 0, "bottom": 24, "left": 0 },
        "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 },
        "zIndex": 1,
        "alignSelf": "center",
        "flexGrow": 0, "flexShrink": 1, "flexBasis": null,
        "gridColumn": null, "gridRow": null,
        "gridTemplateColumns": null, "gridTemplateRows": null, "gridGap": 0,
        "carouselConfig": {
          "direction": "circular",
          "autoPlay": true,
          "autoPlayInterval": 20000,
          "pauseOnHover": true,
          "loop": true,
          "itemsPerView": 6,
          "gap": 0,
          "navigation": "none",
          "speed": 600,
          "easing": "linear"
        }
      },
      "style": {
        "backgroundColor": "transparent",
        "backgroundImage": null,
        "backgroundSize": "cover",
        "backgroundPosition": "center",
        "borderRadius": { "topLeft": 0, "topRight": 0, "bottomRight": 0, "bottomLeft": 0 },
        "border": { "top": { "width": 0, "color": "transparent", "style": "none" }, "right": { "width": 0, "color": "transparent", "style": "none" }, "bottom": { "width": 0, "color": "transparent", "style": "none" }, "left": { "width": 0, "color": "transparent", "style": "none" } },
        "boxShadow": [],
        "opacity": 1,
        "filter": { "blur": 0, "brightness": 1, "contrast": 1, "saturate": 1, "grayscale": 0, "hueRotate": 0, "backdropBlur": 0, "backdropBrightness": 1, "backdropSaturate": 1 },
        "transform": { "rotate": 0, "scaleX": 1, "scaleY": 1, "skewX": 0, "skewY": 0, "translateX": 0, "translateY": 0, "perspective": null },
        "overflow": "visible",
        "cursor": "default"
      },
      "content": null,
      "typography": null,
      "interaction": null,
      "animation": {
        "type": "orbit",
        "duration": 20000,
        "delay": 0,
        "easing": "linear",
        "iterationCount": "infinite",
        "direction": "normal",
        "fillMode": "both",
        "trigger": "on-load",
        "keyframes": null
      },
      "dataBinding": null,
      "conditions": null,
      "children": [
        {
          "id": "el_avatar_item",
          "type": "avatar",
          "name": "Author Avatar",
          "locked": false,
          "visible": true,
          "layout": {
            "position": "flow",
            "x": null, "y": null,
            "width": 64, "height": 64,
            "minWidth": null, "maxWidth": null,
            "minHeight": null, "maxHeight": null,
            "margin": { "top": 0, "right": 0, "bottom": 0, "left": 0 },
            "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 },
            "zIndex": 2,
            "alignSelf": "center",
            "flexGrow": 0, "flexShrink": 0, "flexBasis": null,
            "gridColumn": null, "gridRow": null,
            "gridTemplateColumns": null, "gridTemplateRows": null, "gridGap": 0,
            "carouselConfig": null
          },
          "style": {
            "backgroundColor": { "type": "var", "name": "accent" },
            "backgroundImage": null,
            "backgroundSize": "cover",
            "backgroundPosition": "center",
            "borderRadius": { "topLeft": 50, "topRight": 50, "bottomRight": 50, "bottomLeft": 50 },
            "border": { "top": { "width": 3, "color": { "type": "var", "name": "accent" }, "style": "solid" }, "right": { "width": 3, "color": { "type": "var", "name": "accent" }, "style": "solid" }, "bottom": { "width": 3, "color": { "type": "var", "name": "accent" }, "style": "solid" }, "left": { "width": 3, "color": { "type": "var", "name": "accent" }, "style": "solid" } },
            "boxShadow": [{ "x": 0, "y": 4, "blur": 12, "spread": 0, "color": "rgba(0,0,0,0.15)", "inset": false }],
            "opacity": 1,
            "filter": { "blur": 0, "brightness": 1, "contrast": 1, "saturate": 1, "grayscale": 0, "hueRotate": 0, "backdropBlur": 0, "backdropBrightness": 1, "backdropSaturate": 1 },
            "transform": { "rotate": 0, "scaleX": 1, "scaleY": 1, "skewX": 0, "skewY": 0, "translateX": 0, "translateY": 0, "perspective": null },
            "overflow": "hidden",
            "cursor": "pointer"
          },
          "content": { "text": null, "html": null, "image": null, "video": null, "icon": null, "lottieUrl": null, "altText": "{{testimonial.author.name}} avatar" },
          "typography": null,
          "interaction": {
            "hover": { "transform": { "rotate": 0, "scaleX": 1.2, "scaleY": 1.2, "skewX": 0, "skewY": 0, "translateX": 0, "translateY": 0, "perspective": null }, "boxShadow": [{ "x": 0, "y": 8, "blur": 20, "spread": 0, "color": "rgba(0,0,0,0.25)", "inset": false }] },
            "active": null,
            "focus": null,
            "click": null,
            "tooltip": "{{testimonial.author.name}}",
            "transition": { "property": "all", "duration": 200, "easing": "ease-out", "delay": 0 }
          },
          "animation": null,
          "dataBinding": { "bindingKey": "author_avatar", "property": "content.image" },
          "conditions": null,
          "children": []
        }
      ]
    },
    {
      "id": "el_reveal_card",
      "type": "testimonial-card",
      "name": "Hover Reveal Card",
      "locked": false,
      "visible": true,
      "layout": {
        "position": "flow",
        "x": null, "y": null,
        "width": "100%", "height": "auto",
        "minWidth": null, "maxWidth": 600,
        "minHeight": null, "maxHeight": null,
        "margin": { "top": 0, "right": "auto", "bottom": 0, "left": "auto" },
        "padding": { "top": 24, "right": 24, "bottom": 24, "left": 24 },
        "zIndex": 3,
        "alignSelf": "center",
        "flexGrow": 0, "flexShrink": 1, "flexBasis": null,
        "gridColumn": null, "gridRow": null,
        "gridTemplateColumns": null, "gridTemplateRows": null, "gridGap": 0,
        "carouselConfig": null
      },
      "style": {
        "backgroundColor": "#FFFFFF",
        "backgroundImage": null,
        "backgroundSize": "cover",
        "backgroundPosition": "center",
        "borderRadius": { "topLeft": 16, "topRight": 16, "bottomRight": 16, "bottomLeft": 16 },
        "border": { "top": { "width": 0, "color": "transparent", "style": "none" }, "right": { "width": 0, "color": "transparent", "style": "none" }, "bottom": { "width": 0, "color": "transparent", "style": "none" }, "left": { "width": 0, "color": "transparent", "style": "none" } },
        "boxShadow": [{ "x": 0, "y": 20, "blur": 40, "spread": -8, "color": "rgba(0,0,0,0.12)", "inset": false }],
        "opacity": 0,
        "filter": { "blur": 8, "brightness": 1, "contrast": 1, "saturate": 1, "grayscale": 0, "hueRotate": 0, "backdropBlur": 0, "backdropBrightness": 1, "backdropSaturate": 1 },
        "transform": { "rotate": 0, "scaleX": 1, "scaleY": 1, "skewX": 0, "skewY": 0, "translateX": 0, "translateY": 16, "perspective": null },
        "overflow": "hidden",
        "cursor": "default"
      },
      "content": null,
      "typography": null,
      "interaction": {
        "hover": null,
        "active": null,
        "focus": null,
        "click": null,
        "tooltip": null,
        "transition": null
      },
      "animation": {
        "type": "fade-in-up",
        "duration": 300,
        "delay": 0,
        "easing": "cubic-bezier(0.16, 1, 0.3, 1)",
        "iterationCount": 1,
        "direction": "normal",
        "fillMode": "forwards",
        "trigger": "on-hover",
        "keyframes": [
          { "offset": 0, "style": { "opacity": 0, "transform": { "rotate": 0, "scaleX": 1, "scaleY": 1, "skewX": 0, "skewY": 0, "translateX": 0, "translateY": 16, "perspective": null }, "filter": { "blur": 8, "brightness": 1, "contrast": 1, "saturate": 1, "grayscale": 0, "hueRotate": 0, "backdropBlur": 0, "backdropBrightness": 1, "backdropSaturate": 1 } } },
          { "offset": 1, "style": { "opacity": 1, "transform": { "rotate": 0, "scaleX": 1, "scaleY": 1, "skewX": 0, "skewY": 0, "translateX": 0, "translateY": 0, "perspective": null }, "filter": { "blur": 0, "brightness": 1, "contrast": 1, "saturate": 1, "grayscale": 0, "hueRotate": 0, "backdropBlur": 0, "backdropBrightness": 1, "backdropSaturate": 1 } } }
        ]
      },
      "dataBinding": null,
      "conditions": { "showIf": "hoveredAvatar !== null", "showOnHover": true, "showOnScroll": false, "showOnBreakpoint": null, "showWhenEmpty": false },
      "children": [
        {
          "id": "el_reveal_name",
          "type": "heading",
          "name": "Author Name",
          "locked": false, "visible": true,
          "layout": { "position": "flow", "x": null, "y": null, "width": "100%", "height": "auto", "minWidth": null, "maxWidth": null, "minHeight": null, "maxHeight": null, "margin": { "top": 0, "right": 0, "bottom": 4, "left": 0 }, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "zIndex": 1, "alignSelf": "auto", "flexGrow": 0, "flexShrink": 1, "flexBasis": null, "gridColumn": null, "gridRow": null, "gridTemplateColumns": null, "gridTemplateRows": null, "gridGap": 0, "carouselConfig": null },
          "style": { "backgroundColor": "transparent", "backgroundImage": null, "backgroundSize": "cover", "backgroundPosition": "center", "borderRadius": { "topLeft": 0, "topRight": 0, "bottomRight": 0, "bottomLeft": 0 }, "border": { "top": { "width": 0, "color": "transparent", "style": "none" }, "right": { "width": 0, "color": "transparent", "style": "none" }, "bottom": { "width": 0, "color": "transparent", "style": "none" }, "left": { "width": 0, "color": "transparent", "style": "none" } }, "boxShadow": [], "opacity": 1, "filter": { "blur": 0, "brightness": 1, "contrast": 1, "saturate": 1, "grayscale": 0, "hueRotate": 0, "backdropBlur": 0, "backdropBrightness": 1, "backdropSaturate": 1 }, "transform": { "rotate": 0, "scaleX": 1, "scaleY": 1, "skewX": 0, "skewY": 0, "translateX": 0, "translateY": 0, "perspective": null }, "overflow": "visible", "cursor": "default" },
          "content": { "text": "{{testimonial.author.name}}", "html": null, "image": null, "video": null, "icon": null, "lottieUrl": null, "altText": null },
          "typography": { "fontFamily": "Inter", "fontSize": 18, "fontWeight": 700, "fontStyle": "normal", "lineHeight": 1.3, "letterSpacing": -0.02, "color": "#1E293B", "textAlign": "center", "textDecoration": "none", "textTransform": "none", "textOverflow": "clip", "maxLines": 1, "whiteSpace": "nowrap" },
          "interaction": null, "animation": null,
          "dataBinding": { "bindingKey": "author_name", "property": "content.text" },
          "conditions": null, "children": []
        },
        {
          "id": "el_reveal_stars",
          "type": "rating-stars",
          "name": "Star Rating",
          "locked": false, "visible": true,
          "layout": { "position": "flow", "x": null, "y": null, "width": "auto", "height": 24, "minWidth": null, "maxWidth": null, "minHeight": null, "maxHeight": null, "margin": { "top": 0, "right": 0, "bottom": 12, "left": 0 }, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "zIndex": 1, "alignSelf": "center", "flexGrow": 0, "flexShrink": 0, "flexBasis": null, "gridColumn": null, "gridRow": null, "gridTemplateColumns": null, "gridTemplateRows": null, "gridGap": 0, "carouselConfig": null },
          "style": { "backgroundColor": "transparent", "backgroundImage": null, "backgroundSize": "cover", "backgroundPosition": "center", "borderRadius": { "topLeft": 0, "topRight": 0, "bottomRight": 0, "bottomLeft": 0 }, "border": { "top": { "width": 0, "color": "transparent", "style": "none" }, "right": { "width": 0, "color": "transparent", "style": "none" }, "bottom": { "width": 0, "color": "transparent", "style": "none" }, "left": { "width": 0, "color": "transparent", "style": "none" } }, "boxShadow": [], "opacity": 1, "filter": { "blur": 0, "brightness": 1, "contrast": 1, "saturate": 1, "grayscale": 0, "hueRotate": 0, "backdropBlur": 0, "backdropBrightness": 1, "backdropSaturate": 1 }, "transform": { "rotate": 0, "scaleX": 1, "scaleY": 1, "skewX": 0, "skewY": 0, "translateX": 0, "translateY": 0, "perspective": null }, "overflow": "visible", "cursor": "default" },
          "content": null, "typography": null, "interaction": null, "animation": null,
          "dataBinding": { "bindingKey": "rating", "property": "content.text" },
          "conditions": null, "children": []
        },
        {
          "id": "el_reveal_message",
          "type": "text",
          "name": "Testimonial Message",
          "locked": false, "visible": true,
          "layout": { "position": "flow", "x": null, "y": null, "width": "100%", "height": "auto", "minWidth": null, "maxWidth": null, "minHeight": null, "maxHeight": null, "margin": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "zIndex": 1, "alignSelf": "auto", "flexGrow": 0, "flexShrink": 1, "flexBasis": null, "gridColumn": null, "gridRow": null, "gridTemplateColumns": null, "gridTemplateRows": null, "gridGap": 0, "carouselConfig": null },
          "style": { "backgroundColor": "transparent", "backgroundImage": null, "backgroundSize": "cover", "backgroundPosition": "center", "borderRadius": { "topLeft": 0, "topRight": 0, "bottomRight": 0, "bottomLeft": 0 }, "border": { "top": { "width": 0, "color": "transparent", "style": "none" }, "right": { "width": 0, "color": "transparent", "style": "none" }, "bottom": { "width": 0, "color": "transparent", "style": "none" }, "left": { "width": 0, "color": "transparent", "style": "none" } }, "boxShadow": [], "opacity": 1, "filter": { "blur": 0, "brightness": 1, "contrast": 1, "saturate": 1, "grayscale": 0, "hueRotate": 0, "backdropBlur": 0, "backdropBrightness": 1, "backdropSaturate": 1 }, "transform": { "rotate": 0, "scaleX": 1, "scaleY": 1, "skewX": 0, "skewY": 0, "translateX": 0, "translateY": 0, "perspective": null }, "overflow": "visible", "cursor": "default" },
          "content": { "text": "{{testimonial.message}}", "html": null, "image": null, "video": null, "icon": null, "lottieUrl": null, "altText": null },
          "typography": { "fontFamily": "Inter", "fontSize": 15, "fontWeight": 400, "fontStyle": "italic", "lineHeight": 1.6, "letterSpacing": 0, "color": "#64748B", "textAlign": "center", "textDecoration": "none", "textTransform": "none", "textOverflow": "ellipsis", "maxLines": 3, "whiteSpace": "normal" },
          "interaction": null, "animation": null,
          "dataBinding": { "bindingKey": "message", "property": "content.text" },
          "conditions": null, "children": []
        }
      ]
    }
  ],
  "animations": [],
  "breakpoints": {
    "mobile": [
      { "elementId": "el_orbit", "overrides": { "layout": { "height": 200 }, "visible": true } },
      { "elementId": "el_avatar_item", "overrides": { "layout": { "width": 48, "height": 48 } } },
      { "elementId": "el_reveal_card", "overrides": { "layout": { "padding": { "top": 16, "right": 16, "bottom": 16, "left": 16 } } } }
    ],
    "tablet": [],
    "desktop": []
  },
  "dataBindings": [
    { "key": "author_avatar", "source": "testimonial", "path": "author.avatarUrl", "fallback": "", "transform": null },
    { "key": "author_name", "source": "testimonial", "path": "author.name", "fallback": "Anonymous", "transform": null },
    { "key": "rating", "source": "testimonial", "path": "content.rating", "fallback": "5", "transform": null },
    { "key": "message", "source": "testimonial", "path": "content.message", "fallback": "", "transform": { "type": "truncate", "maxLength": 200 } }
  ],
  "fonts": [
    { "family": "Inter", "source": "google", "url": null, "weights": [400, 500, 600, 700] }
  ],
  "theme": {
    "colors": { "accent": { "type": "var", "name": "primary-500" }, "card-bg": "#FFFFFF", "text-primary": "#1E293B", "text-secondary": "#64748B" },
    "spacing": { "xs": 4, "sm": 8, "md": 16, "lg": 24, "xl": 32 },
    "fonts": { "heading": "Inter", "body": "Inter" }
  },
  "metadata": {
    "createdBy": "usr_abc123",
    "tenantId": null,
    "appId": null,
    "isTemplate": true,
    "isPremium": false,
    "isPublished": true,
    "isAiGenerated": false,
    "parentTemplateId": null,
    "tags": ["carousel", "circular", "hover", "avatar"],
    "thumbnailUrl": "https://cdn.testimonialapi.dev/thumbnails/dsgn_circ_hover_001.webp",
    "category": "carousel",
    "createdAt": "2025-01-15T10:00:00Z",
    "updatedAt": "2025-01-15T10:00:00Z"
  }
}
2. Database Schema Additions (PostgreSQL)
These tables are additive to the existing schema.sql from Doc 1. They do not modify any existing tables except one ALTER TABLE on widgets.

SQL

-- ============================================================
-- DESIGN SCHEMAS
-- ============================================================
CREATE TABLE design_schemas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id           TEXT UNIQUE NOT NULL,
  tenant_id           UUID REFERENCES tenants(id) ON DELETE CASCADE,
  app_id              UUID REFERENCES apps(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  description         TEXT,
  type                TEXT NOT NULL DEFAULT 'widget',
  version             INTEGER NOT NULL DEFAULT 1,
  schema_data         JSONB NOT NULL,
  thumbnail_url       TEXT,
  is_template         BOOLEAN NOT NULL DEFAULT FALSE,
  is_premium          BOOLEAN NOT NULL DEFAULT FALSE,
  is_published        BOOLEAN NOT NULL DEFAULT FALSE,
  is_ai_generated     BOOLEAN NOT NULL DEFAULT FALSE,
  parent_template_id  UUID REFERENCES design_schemas(id) ON DELETE SET NULL,
  category            TEXT,
  tags                TEXT[] NOT NULL DEFAULT '{}',
  created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_designs_tenant ON design_schemas(tenant_id) WHERE tenant_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_designs_app ON design_schemas(app_id) WHERE app_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_designs_global ON design_schemas(is_template, category) WHERE tenant_id IS NULL AND deleted_at IS NULL;
CREATE INDEX idx_designs_tags ON design_schemas USING GIN (tags) WHERE deleted_at IS NULL;
CREATE INDEX idx_designs_published ON design_schemas(public_id) WHERE is_published = TRUE AND deleted_at IS NULL;

-- ============================================================
-- DESIGN VERSIONS (full history, every save)
-- ============================================================
CREATE TABLE design_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id       UUID NOT NULL REFERENCES design_schemas(id) ON DELETE CASCADE,
  version         INTEGER NOT NULL,
  schema_data     JSONB NOT NULL,
  change_summary  TEXT,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(design_id, version)
);
CREATE INDEX idx_versions_design ON design_versions(design_id, version DESC);

-- ============================================================
-- LINK WIDGETS TO DESIGNS
-- ============================================================
ALTER TABLE widgets ADD COLUMN design_id UUID REFERENCES design_schemas(id) ON DELETE SET NULL;
ALTER TABLE widgets ADD COLUMN design_version INTEGER;
-- A widget optionally references a specific design version.
-- If design_version is null, the widget always uses the latest published version.
-- If pinned, the widget stays on that version until manually updated.

-- ============================================================
-- TEMPLATE MARKETPLACE (curation layer on top of design_schemas)
-- ============================================================
CREATE TABLE template_marketplace (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id           UUID NOT NULL REFERENCES design_schemas(id) ON DELETE CASCADE,
  category            TEXT NOT NULL,
  description         TEXT,
  preview_video_url   TEXT,
  use_count           INTEGER NOT NULL DEFAULT 0,
  clone_count         INTEGER NOT NULL DEFAULT 0,
  rating_avg          NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count        INTEGER NOT NULL DEFAULT 0,
  featured            BOOLEAN NOT NULL DEFAULT FALSE,
  status              TEXT NOT NULL DEFAULT 'active',
  submitted_by_tenant UUID REFERENCES tenants(id) ON DELETE SET NULL,
  reviewed_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(design_id)
);
CREATE INDEX idx_marketplace_category ON template_marketplace(category, featured DESC, use_count DESC);

-- ============================================================
-- MEDIA LIBRARY
-- ============================================================
CREATE TABLE media_assets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  app_id            UUID REFERENCES apps(id) ON DELETE SET NULL,
  filename          TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  content_type      TEXT NOT NULL,
  size_bytes        INTEGER NOT NULL,
  url               TEXT NOT NULL,
  thumbnail_url     TEXT,
  width             INTEGER,
  height            INTEGER,
  duration_seconds  INTEGER,
  alt_text          TEXT,
  tags              TEXT[] NOT NULL DEFAULT '{}',
  uploaded_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_media_tenant ON media_assets(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_media_type ON media_assets(content_type) WHERE deleted_at IS NULL;

-- ============================================================
-- AI DESIGN GENERATION LOGS
-- ============================================================
CREATE TABLE ai_design_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES tenants(id) ON DELETE SET NULL,
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  prompt            TEXT NOT NULL,
  parameters        JSONB NOT NULL DEFAULT '{}',
  generated_schema  JSONB,
  design_id         UUID REFERENCES design_schemas(id) ON DELETE SET NULL,
  status            TEXT NOT NULL,
  ai_provider_id    UUID REFERENCES ai_providers(id) ON DELETE SET NULL,
  cost_usd          NUMERIC(10,6) NOT NULL DEFAULT 0,
  latency_ms        INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);
CREATE INDEX idx_ai_design_tenant ON ai_design_logs(tenant_id, created_at DESC);
3. Repository Interfaces (Ports)
TypeScript

// packages/domain/repositories/design-schema.repository.interface.ts

export interface DesignFilters {
  tenantId?: string | null;
  appId?: string | null;
  isTemplate?: boolean;
  isPublished?: boolean;
  type?: DesignType;
  category?: string;
  tags?: string[];
  search?: string;
}

export interface IDesignSchemaRepository {
  findById(id: string): Promise<DesignSchema | null>;
  findByPublicId(publicId: string): Promise<DesignSchema | null>;
  findMany(filters: DesignFilters, pagination: PaginationParams): Promise<PaginatedResult<DesignSchema>>;
  findGlobalTemplates(category?: string): Promise<DesignSchema[]>;
  findByTenant(tenantId: string, appId?: string): Promise<DesignSchema[]>;
  create(data: Omit<DesignSchema, 'id' | 'metadata.createdAt' | 'metadata.updatedAt'>): Promise<DesignSchema>;
  update(id: string, data: Partial<DesignSchema>): Promise<DesignSchema>;
  publish(id: string): Promise<void>;
  unpublish(id: string): Promise<void>;
  softDelete(id: string): Promise<void>;

  // Versioning
  createVersion(designId: string, schemaData: object, changeSummary: string, createdBy: string): Promise<number>;
  getVersion(designId: string, version: number): Promise<DesignSchema | null>;
  getVersions(designId: string): Promise<Array<{ version: number; changeSummary: string | null; createdBy: string; createdAt: Date }>>;
  rollbackToVersion(designId: string, targetVersion: number): Promise<DesignSchema>;

  // Cloning
  clone(sourceId: string, targetTenantId: string, targetAppId: string | null, clonedBy: string): Promise<DesignSchema>;
}

// packages/domain/repositories/media-asset.repository.interface.ts
export interface IMediaAssetRepository {
  findById(id: string): Promise<MediaAsset | null>;
  findByTenant(tenantId: string, filters?: { contentType?: string; tags?: string[] }): Promise<MediaAsset[]>;
  create(data: Omit<MediaAsset, 'id' | 'createdAt'>): Promise<MediaAsset>;
  update(id: string, data: Partial<MediaAsset>): Promise<MediaAsset>;
  softDelete(id: string): Promise<void>;
}

// packages/domain/repositories/template-marketplace.repository.interface.ts
export interface ITemplateMarketplaceRepository {
  findByDesignId(designId: string): Promise<TemplateMarketplaceEntry | null>;
  findGlobalTemplates(filters: { category?: string; featured?: boolean; search?: string }, pagination: PaginationParams): Promise<PaginatedResult<TemplateMarketplaceEntry>>;
  create(data: Omit<TemplateMarketplaceEntry, 'id' | 'createdAt'>): Promise<TemplateMarketplaceEntry>;
  incrementUseCount(designId: string): Promise<void>;
  incrementCloneCount(designId: string): Promise<void>;
  updateRating(designId: string, rating: number): Promise<void>;
  approve(designId: string, reviewedBy: string): Promise<void>;
  reject(designId: string, reviewedBy: string): Promise<void>;
}
4. API Endpoints
4.1 Design Schema CRUD
Method	Path	Auth	Perm	Description
GET	/v1/dashboard/designs	Session	tenant.widgets.manage	List designs (scoped to tenant, filterable by app/type/tags)
POST	/v1/dashboard/designs	Session	tenant.widgets.manage	Create new design (full DesignSchema in body)
GET	/v1/dashboard/designs/:id	Session	tenant.widgets.manage	Get full design with schema
PATCH	/v1/dashboard/designs/:id	Session	tenant.widgets.manage	Update design (creates new version automatically)
DELETE	/v1/dashboard/designs/:id	Session	tenant.widgets.manage	Soft delete
POST	/v1/dashboard/designs/:id/publish	Session	tenant.widgets.manage	Mark as published (live for widgets)
POST	/v1/dashboard/designs/:id/unpublish	Session	tenant.widgets.manage	Unpublish
POST	/v1/dashboard/designs/:id/clone	Session	tenant.widgets.manage	Clone to another app or to tenant-wide
4.2 Versioning
Method	Path	Auth	Perm	Description
GET	/v1/dashboard/designs/:id/versions	Session	tenant.widgets.manage	List version history
GET	/v1/dashboard/designs/:id/versions/:version	Session	tenant.widgets.manage	Get specific version's schema
POST	/v1/dashboard/designs/:id/rollback	Session	tenant.widgets.manage	Rollback to version (body: { version: number })
4.3 Template Marketplace
Method	Path	Auth	Perm	Description
GET	/v1/dashboard/templates/marketplace	Session	—	Browse global templates (all tenants can view)
POST	/v1/dashboard/templates/marketplace/:id/clone	Session	tenant.widgets.manage	Clone global template to tenant
POST	/v1/dashboard/templates/submit	Session	tenant.widgets.manage	Submit tenant template for global review
GET	/v1/platform/templates/marketplace/review	Session	platform.templates.manage	Review queue (platform admins)
POST	/v1/platform/templates/marketplace/:id/approve	Session	platform.templates.manage	Approve for global gallery
POST	/v1/platform/templates/marketplace/:id/reject	Session	platform.templates.manage	Reject with reason
4.4 Media Library
Method	Path	Auth	Perm	Description
GET	/v1/dashboard/media	Session	tenant.widgets.manage	List media assets
POST	/v1/dashboard/media/upload-url	Session	tenant.widgets.manage	Get signed upload URL (direct-to-GCS)
POST	/v1/dashboard/media/confirm-upload	Session	tenant.widgets.manage	Confirm upload complete, create DB record
PATCH	/v1/dashboard/media/:id	Session	tenant.widgets.manage	Update metadata (alt text, tags)
DELETE	/v1/dashboard/media/:id	Session	tenant.widgets.manage	Soft delete
4.5 AI Design Generation
Method	Path	Auth	Perm	Description
POST	/v1/dashboard/ai/generate-design	Session	tenant.widgets.manage	Generate design from text prompt
POST	/v1/dashboard/ai/refine-design	Session	tenant.widgets.manage	Refine existing design with follow-up prompt
GET	/v1/dashboard/ai/design-history	Session	tenant.widgets.manage	Past AI-generated designs
4.6 Public (Widget Runtime)
Method	Path	Auth	Description
GET	/v1/public/designs/:publicId	pk_*	Get published design schema (for widget.js renderer)
GET	/v1/public/designs/:publicId/render-data	pk_*	Get design schema + pre-fetched testimonials in one call
5. Widget Runtime Architecture
5.1 Runtime Flow
text

Browser loads page with <script data-widget="wdg_xxx" data-app="app_xxx">
  │
  ▼
widget.js loads (~15KB gzipped from CDN)
  │
  ▼
Reads data-* attributes from script tag
  │
  ▼
GET /v1/public/designs/:publicId/render-data
  → Returns: { design: DesignSchema, testimonials: Testimonial[] }
  │
  ▼
Renderer Engine:
  1. Parse DesignSchema element tree
  2. For each element:
     a. Resolve data bindings (replace {{keys}} with real values)
     b. Apply responsive overrides for current viewport
     c. Create DOM node (or Web Component)
     d. Apply inline styles from schema
     e. Register event listeners (hover, click, scroll)
     f. Register animations (CSS @keyframes or JS-driven)
  3. Mount tree into Shadow DOM container
  4. Start carousel/marquee/orbit loops
  5. Set up IntersectionObserver for scroll-triggered animations
  │
  ▼
Auto-refresh testimonials every 5 min (configurable)
5.2 Runtime Bundle Structure
text

apps/widget-runtime/
├── src/
│   ├── index.ts                 # Entry point, reads data-* attrs, bootstraps
│   ├── renderer/
│   │   ├── engine.ts            # Main render loop: schema → DOM
│   │   ├── element-factory.ts   # Creates DOM nodes per ElementType
│   │   ├── style-applier.ts     # Converts StyleConfig → CSS properties
│   │   ├── layout-applier.ts    # Converts LayoutConfig → CSS flexbox/grid
│   │   ├── typography-applier.ts
│   │   ├── animation-engine.ts  # CSS keyframe injection + JS animation loops
│   │   ├── data-binder.ts       # Resolves {{binding}} syntax against data
│   │   ├── interaction-handler.ts # Hover/click/scroll event binding
│   │   └── responsive-engine.ts # Viewport listener + breakpoint override application
│   ├── elements/
│   │   ├── container.ts
│   │   ├── carousel.ts          # Horizontal/vertical slider
│   │   ├── circular-carousel.ts # Orbital animation (CSS transform)
│   │   ├── marquee.ts           # Infinite scroll
│   │   ├── masonry.ts           # CSS columns-based masonry
│   │   ├── text.ts
│   │   ├── image.ts
│   │   ├── avatar.ts
│   │   ├── video.ts
│   │   ├── rating-stars.ts      # SVG star renderer
│   │   ├── testimonial-card.ts  # Composite element
│   │   ├── testimonial-wall.ts  # Masonry of cards
│   │   └── ...one per ElementType
│   ├── shadow-dom.ts            # Shadow DOM creation + style isolation
│   ├── theme-engine.ts          # Generates CSS variables from brand color
│   └── api-client.ts            # Fetch wrapper for /v1/public/* endpoints
├── rollup.config.ts             # Bundles to single ~15KB file
└── package.json
5.3 Shadow DOM Isolation
TypeScript

// shadow-dom.ts
export function createWidgetContainer(hostElement: HTMLElement, themeColor: string): ShadowRoot {
  const shadow = hostElement.attachShadow({ mode: 'open' });

  // Inject isolated styles
  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; display: block; }
    :host * { box-sizing: border-box; }
    ${generateThemeCSS(themeColor)}
  `;
  shadow.appendChild(style);

  // Container for rendered elements
  const container = document.createElement('div');
  container.setAttribute('data-testid', 'testimonial-widget');
  shadow.appendChild(container);

  return shadow;
}
This ensures the widget's styles never leak into the host page and the host page's styles never leak into the widget — critical for embed reliability across WordPress, Shopify, Webflow, etc.

6. File Structure Additions
New files added to the monorepo from Doc 1's skeleton:

text

apps/
├── api/src/
│   ├── modules/
│   │   ├── designs/                    # NEW
│   │   │   ├── designs.module.ts
│   │   │   ├── designs-dashboard.controller.ts
│   │   │   ├── designs-public.controller.ts
│   │   │   ├── designs.service.ts
│   │   │   ├── design-versioning.service.ts
│   │   │   └── design-cloning.service.ts
│   │   ├── media/                      # NEW
│   │   │   ├── media.module.ts
│   │   │   ├── media.controller.ts
│   │   │   └── media.service.ts
│   │   ├── templates-marketplace/      # NEW
│   │   │   ├── marketplace.module.ts
│   │   │   ├── marketplace-dashboard.controller.ts
│   │   │   ├── marketplace-platform.controller.ts
│   │   │   └── marketplace.service.ts
│   │   └── ai-design/                  # NEW
│   │       ├── ai-design.module.ts
│   │       ├── ai-design.controller.ts
│   │       └── ai-design.service.ts
│   └── infrastructure/
│       └── database/
│           ├── postgres/repositories/
│           │   ├── postgres-design-schema.repository.ts
│           │   ├── postgres-media-asset.repository.ts
│           │   └── postgres-template-marketplace.repository.ts
│           └── firestore/repositories/
│               ├── firestore-design-schema.repository.ts
│               ├── firestore-media-asset.repository.ts
│               └── firestore-template-marketplace.repository.ts
├── widget-runtime/                     # NEW (entire app)
│   ├── src/ (see §5.2)
│   ├── rollup.config.ts
│   └── package.json
├── tenant-dashboard/
│   └── app/(dashboard)/
│       ├── designs/                    # NEW (Visual Editor pages)
│       │   ├── page.tsx                # Design list
│       │   └── [designId]/
│       │       └── page.tsx            # Visual Editor canvas
│       ├── media/                      # NEW
│       │   └── page.tsx                # Media library
│       └── templates/                  # NEW
│           ├── page.tsx                # Template browser
│           └── [templateId]/
│               └── page.tsx            # Template preview/clone
└── platform-dashboard/
    └── app/(dashboard)/
        └── templates/
            └── marketplace/            # NEW
                ├── page.tsx            # Global template management
                └── review/
                    └── page.tsx        # Review queue

packages/
├── shared-types/
│   └── design-schema.types.ts          # NEW (the schema from §1)
└── domain/
    ├── entities/
    │   ├── design-schema.entity.ts     # NEW
    │   ├── media-asset.entity.ts       # NEW
    │   └── template-marketplace.entity.ts # NEW
    └── repositories/
        ├── design-schema.repository.interface.ts   # NEW
        ├── media-asset.repository.interface.ts     # NEW
        └── template-marketplace.repository.interface.ts # NEW
✅ DOC 7A — REQUIREMENTS CHECKLIST & DEFINITION OF DONE
A. Schema Completeness
 DesignSchema TypeScript interface in packages/shared-types/ includes every field from §1.2 — verified by compiling with tsc --strict
 Zod validation schema exists for DesignSchema and validates the full circular carousel example from §1.3 without errors — verified
 Zod validation rejects 10+ deliberately malformed schemas (missing required fields, invalid ElementType, negative opacity, invalid color format) — verified
 All ElementType values (35+ types) are defined in the union type — verified
 All AnimationType values (25+ types) are defined — verified
 Dimension type correctly accepts number, "100%", "50vw", "auto", "fit-content" and rejects invalid strings — verified
B. Database Checks
 All new SQL tables (design_schemas, design_versions, template_marketplace, media_assets, ai_design_logs) added to schema.sql and migration runs clean on fresh Postgres — verified
 ALTER TABLE widgets ADD COLUMN design_id runs without breaking existing data — verified
 All indexes exist and are confirmed via \di — verified
 ai_design_logs partitioning works — verified by inserting rows across two months
 Foreign key constraints enforce referential integrity (deleting a tenant cascades to its designs) — verified
 design_versions unique constraint on (design_id, version) prevents duplicate versions — verified
C. Repository Interface Checks
 IDesignSchemaRepository interface exists with all methods from §3 — verified
 Both Postgres and Firestore implementations exist and pass the same integration test suite — verified
 clone() method creates a deep copy with new IDs, new version 1, and correct tenantId/appId — verified
 rollbackToVersion() correctly restores the schema data from the target version and creates a new version entry — verified
 IMediaAssetRepository and ITemplateMarketplaceRepository interfaces exist with implementations — verified
D. API Contract Checks
 All endpoints from §4 exist as NestJS controller methods with correct HTTP methods, paths, auth guards, and permission decorators — verified
 Request DTOs have Zod validation matching the DesignSchema constraints — verified
 POST /v1/dashboard/designs accepts the full example from §1.3 and stores it correctly — verified
 GET /v1/public/designs/:publicId returns only published designs and rejects unpublished ones with 404 — verified
 GET /v1/public/designs/:publicId with pk_* never returns designs belonging to a different tenant — verified
 Version history endpoints return correct version numbers and change summaries — verified
E. Widget Runtime Checks
 widget-runtime app exists with the file structure from §5.2 — verified
 Runtime bundle compiles to a single file <20KB gzipped — verified via gzip -c dist/widget.js | wc -c
 Runtime correctly creates a Shadow DOM container — verified by inspecting the DOM in DevTools
 Runtime fetches design + testimonials from the API and renders the circular carousel example — verified in a test HTML page
 Data bindings resolve correctly (avatar image, author name, rating, message) — verified
 Responsive overrides apply at mobile/tablet breakpoints — verified by resizing the browser
 Hover interactions work (avatar scale-up, card fade-in) — verified
 Theme color injection works (CSS variables applied inside Shadow DOM) — verified
F. Persistence Checks
 All design data is stored in PostgreSQL (not IndexedDB, not localStorage) — verified by querying the DB after saving
 Closing the browser and reopening the editor loads the last saved version fro
