import { Injectable } from '@nestjs/common';
import type { AiTaskConfig, AiTaskType, CreateAiTaskConfig, IAiTaskConfigRepository } from '@testimonial-api/domain';
import { FirestoreBaseRepository } from '../firestore-base.repository';
import { FirestoreClient } from '../firestore.client';
import { AiTaskConfigFirestoreMapper } from '../mappers/ai-task-config.mapper';

@Injectable()
export class FirestoreAiTaskConfigRepository
  extends FirestoreBaseRepository<AiTaskConfig>
  implements IAiTaskConfigRepository
{
  protected readonly collectionName = 'aiTaskConfigs';
  protected readonly mapper = AiTaskConfigFirestoreMapper;

  constructor(client: FirestoreClient) {
    super(client);
  }

  protected override defaultsFor(): Partial<AiTaskConfig> {
    return {
      routingStrategy: 'failover',
      providerWeights: {},
      confidenceThreshold: 0.7,
      autoApproveThreshold: null,
      maxRetries: 2,
      timeoutMs: 10_000,
      cacheTtlSeconds: 3600,
      isActive: true,
    };
  }

  async findByTaskType(taskType: AiTaskType): Promise<AiTaskConfig | null> {
    const all = await this.fetchAll('taskType', taskType);
    return all.length > 0 ? all[0] : null;
  }

  async listActive(): Promise<AiTaskConfig[]> {
    const all = await this.fetchAll('isActive', true);
    return all;
  }

  override create(data: CreateAiTaskConfig): Promise<AiTaskConfig> {
    return super.create(data as Partial<AiTaskConfig> & { id?: string });
  }

  override update(id: string, data: Partial<AiTaskConfig>): Promise<AiTaskConfig> {
    return super.update(id, data);
  }
}
