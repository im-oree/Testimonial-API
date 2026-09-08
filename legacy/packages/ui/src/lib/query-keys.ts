/**
 * React Query key factory (Doc 4 §1.2). One source of truth for cache keys —
 * every useQuery/useMutation + every realtime invalidation references this.
 */
export const queryKeys = {
  me: ['me'] as const,
  tenants: {
    all: ['tenants'] as const,
    list: (filters: object) => ['tenants', 'list', filters] as const,
    detail: (id: string) => ['tenants', 'detail', id] as const,
  },
  apps: {
    all: ['apps'] as const,
    list: () => ['apps', 'list'] as const,
    detail: (appId: string) => ['apps', 'detail', appId] as const,
    stats: (appId: string) => ['apps', 'stats', appId] as const,
  },
  testimonials: {
    all: (appId: string) => ['testimonials', appId] as const,
    list: (appId: string, filters: object) => ['testimonials', appId, 'list', filters] as const,
    detail: (appId: string, id: string) => ['testimonials', appId, 'detail', id] as const,
  },
  forms: {
    all: (appId: string) => ['forms', appId] as const,
    detail: (appId: string, formId: string) => ['forms', appId, 'detail', formId] as const,
  },
  widgets: {
    all: (appId: string) => ['widgets', appId] as const,
    detail: (appId: string, widgetId: string) => ['widgets', appId, 'detail', widgetId] as const,
  },
  templates: {
    all: ['templates'] as const,
    list: (type?: string) => ['templates', 'list', type ?? 'all'] as const,
  },
  staff: {
    all: ['staff'] as const,
    list: () => ['staff', 'list'] as const,
  },
  integrations: {
    all: (appId: string) => ['integrations', appId] as const,
  },
  webhooks: {
    all: (appId: string) => ['webhooks', appId] as const,
    deliveries: (appId: string, webhookId: string) => ['webhooks', appId, webhookId, 'deliveries'] as const,
  },
  ai: {
    providers: ['ai', 'providers'] as const,
    tasks: ['ai', 'tasks'] as const,
    costs: (filters: object) => ['ai', 'costs', filters] as const,
    logs: (filters: object) => ['ai', 'logs', filters] as const,
  },
  auditLogs: (filters: object) => ['audit', 'logs', filters] as const,
  billing: ['billing'] as const,
  platformAnalytics: (period: string) => ['platform', 'analytics', period] as const,
} as const;
