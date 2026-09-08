export type TemplateType = 'widget' | 'form';

export interface TemplateConfigField {
  key: string;
  label: string;
  type: 'color' | 'boolean' | 'number' | 'text' | 'select' | 'font';
  default: unknown;
  options: string[] | null;
}

export interface Template {
  id: string;
  type: TemplateType;
  name: string;
  description: string | null;
  previewImageUrl: string | null;
  isPremium: boolean;
  /** Semantic version. Widgets/forms pin a version at creation. */
  version: number;
  configSchema: TemplateConfigField[];
  /** Maps to the compiled renderer bundle name (widget-runtime, README §14.4). */
  componentRef: string;
  status: 'active' | 'deprecated';
  createdAt: Date;
  updatedAt: Date;
}

export type CreateTemplate = Omit<Template, 'id' | 'createdAt' | 'updatedAt'>;
