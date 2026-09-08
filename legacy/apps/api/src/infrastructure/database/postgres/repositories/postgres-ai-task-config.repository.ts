import { Injectable } from '@nestjs/common';
import type { AiTaskConfig, AiTaskType, CreateAiTaskConfig, IAiTaskConfigRepository } from '@testimonial-api/domain';
import { PrismaClientService } from '../prisma.client';
import { AiTaskConfigPgMappers } from '../mappers/ai-task-config.mapper';

@Injectable()
export class PostgresAiTaskConfigRepository implements IAiTaskConfigRepository {
  constructor(private readonly prisma: PrismaClientService) {}

  private toDomain(row: unknown): AiTaskConfig {
    return AiTaskConfigPgMappers.toDomain(row as Record<string, unknown>) as AiTaskConfig;
  }

  async findById(id: string): Promise<AiTaskConfig | null> {
    const row = await this.prisma.aiTaskConfig.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByTaskType(taskType: AiTaskType): Promise<AiTaskConfig | null> {
    const row = await this.prisma.aiTaskConfig.findFirst({ where: { task_type: taskType } });
    return row ? this.toDomain(row) : null;
  }

  async listActive(): Promise<AiTaskConfig[]> {
    const rows = await this.prisma.aiTaskConfig.findMany({ where: { is_active: true } });
    return rows.map((r) => this.toDomain(r));
  }

  async create(data: CreateAiTaskConfig): Promise<AiTaskConfig> {
    const row = await this.prisma.aiTaskConfig.create({
      data: AiTaskConfigPgMappers.toPersistence(data as Partial<AiTaskConfig>) as never,
    });
    return this.toDomain(row);
  }

  async update(id: string, data: Partial<AiTaskConfig>): Promise<AiTaskConfig> {
    const row = await this.prisma.aiTaskConfig.update({
      where: { id },
      data: { ...AiTaskConfigPgMappers.toPersistence(data), updated_at: new Date() } as never,
    });
    return this.toDomain(row);
  }
}
