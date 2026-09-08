import type { AiTaskConfig, AiTaskType, CreateAiTaskConfig } from '../entities/ai-task-config.entity';

/**
 * IAiTaskConfigRepository — per-task orchestration policy store
 * (ai_task_configs table / aiTaskConfigs collection). Seeded at setup with
 * the safe defaults (see infra/postgres/seed.sql); editable by platform
 * admins on the "AI Providers" dashboard.
 */
export interface IAiTaskConfigRepository {
  findById(id: string): Promise<AiTaskConfig | null>;
  findByTaskType(taskType: AiTaskType): Promise<AiTaskConfig | null>;
  listActive(): Promise<AiTaskConfig[]>;
  create(data: CreateAiTaskConfig): Promise<AiTaskConfig>;
  update(id: string, data: Partial<AiTaskConfig>): Promise<AiTaskConfig>;
}
