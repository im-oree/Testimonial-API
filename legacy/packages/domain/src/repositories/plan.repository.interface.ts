import type { CreatePlan, Plan } from '../entities/plan.entity';
import type { PlanTier } from '../entities/tenant.entity';

export interface IPlanRepository {
  findById(id: string): Promise<Plan | null>;
  findByTier(tier: PlanTier): Promise<Plan | null>;
  findAll(): Promise<Plan[]>;
  create(data: CreatePlan): Promise<Plan>;
  update(id: string, data: Partial<Plan>): Promise<Plan>;
}
