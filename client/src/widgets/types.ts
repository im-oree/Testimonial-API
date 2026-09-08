/**
 * Widget design contract (DOC 7).
 *
 * Every design in this library renders the SAME data contract — a reviewer's
 * picture (or initials fallback), their name, the rating, the message and
 * when it happened. Designs can look completely different and can add their
 * own "caveats" (hover lift, follow-cursor tilt, auto-rotation, marquee…)
 * but they all accept these props, which makes them plug-and-play: give a
 * design an array of items + the resolved theme tokens and it renders.
 */
import type { JSX } from 'react';
import type { ThemeFontId } from '../lib/types';

/** One review, exactly as public endpoints hand it to a widget. */
export interface WidgetItem {
  id: string;
  authorName: string;
  content: string;
  rating: number | null;
  createdAt: string;
  /** Optional author photo — designs fall back to initials when absent. */
  avatarUrl?: string | null;
}

/** Resolved design tokens (already layered: template -> company -> product). */
export interface WidgetTokens {
  primary: string;
  soft: string;
  accent: string;
  radiusPx: number;
  font: ThemeFontId;
}

export interface WidgetCta {
  href: string;
  label: string;
}

export interface WidgetDesignProps {
  items: WidgetItem[];
  tokens: WidgetTokens;
  /** Optional "leave a review" call-to-action shown when a form is live. */
  cta?: WidgetCta | null;
}

export interface WidgetDesignMeta {
  id: string;
  name: string;
  description: string;
  /** What makes this design special (hover, cursor-follow, motion…). */
  features: string[];
}

export type WidgetComponent = (props: WidgetDesignProps) => JSX.Element;

export interface WidgetRegistryEntry {
  meta: WidgetDesignMeta;
  component: WidgetComponent;
}
