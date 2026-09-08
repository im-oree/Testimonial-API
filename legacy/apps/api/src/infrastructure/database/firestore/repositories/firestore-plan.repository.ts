import { Injectable } from '@nestjs/common';
import type { CreatePlan, IPlanRepository, Plan, PlanTier } from '@testimonial-api/domain';
import { FirestoreBaseRepository } from '../firestore-base.repository';
import { FirestoreClient } from '../firestore.client';
import { PlanFirestoreMapper } from '../mappers/plan.mapper';

@Injectable()
export class FirestorePlanRepository extends FirestoreBaseRepository<Plan> implements IPlanRepository {
  protected readonly collectionName = 'plans';
  protected readonly mapper = PlanFirestoreMapper;

  constructor(client: FirestoreClient) {
    super(client);
  }

  findByTier(tier: PlanTier): Promise<Plan | null> {
    return this.findByField('tier', tier);
  }

  async findAll(): Promise<Plan[]> {
    const snap = await this.col().get();
    return snap.docs.map((d) => this.mapper.toDomain({ id: d.id, data: d.data() }));
  }

  override create(data: CreatePlan): Promise<Plan> {
    return super.create(data as Partial<Plan>);
  }
}
