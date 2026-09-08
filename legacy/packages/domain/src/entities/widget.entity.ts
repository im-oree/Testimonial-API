export type WidgetLayout = 'carousel' | 'grid' | 'wall' | 'spotlight' | 'badge' | 'video_wall';

export interface WidgetFilter {
  tags: string[];
  minRating: number | null;
  /** Server-side hardcoded: public widgets only ever serve status='approved'. */
  featuredOnly: boolean;
  limit: number;
}

export interface Widget {
  id: string;
  appId: string;
  name: string;
  templateId: string;
  /** Pinned at creation; widgets can opt-in to "auto-update to latest" (README §14.5). */
  templateVersion: number;
  layoutType: WidgetLayout;
  filter: WidgetFilter;
  styleOverrides: Record<string, string | number | boolean>;
  embedType: 'script' | 'iframe' | 'react';
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateWidget = Omit<Widget, 'id' | 'createdAt' | 'updatedAt'>;
