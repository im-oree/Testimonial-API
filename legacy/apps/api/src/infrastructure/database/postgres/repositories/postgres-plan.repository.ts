import { Injectable } from '@nestjs/common';
import type { CreatePlan, IPlanRepository, Plan, PlanTier } from '@testimonial-api/domain';
import { PrismaClientService } from '../prisma.client';
import { PlanPgMappers } from '../mappers/plan.mapper';

@Injectable()
export class PostgresPlanRepository implements IPlanRepository {
  constructor(private readonly prisma: PrismaClientService) {}

  private toDomain(row: unknown): Plan {
    return PlanPgMappers.toDomain(row as Record<string, unknown>) as Plan;
  }

  async findById(id: string): Promise<Plan | null> {
    const row = await this.prisma.plan.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByTier(tier: PlanTier): Promise<Plan | null> {
    const row = await this.prisma.plan.findUnique({ where: { tier } });
    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<Plan[]> {
    const rows = await this.prisma.plan.findMany({ orderBy: { price_cents: 'asc' } });
    return rows.map((r) => this.toDomain(r));
  }

  async create(data: CreatePlan): Promise<Plan> {
    const row = await this.prisma.plan.create({ data: PlanPgMappers.toPersistence(data as Partial<Plan>) as never });
    return this.toDomain(row);
  }

  async update(id: string, data: Partial<Plan>): Promise<Plan> {
    const row = await this.prisma.plan.update({
      where: { id },
      data: { ...PlanPgMappers.toPersistence(data), updated_at: new Date() } as never,
    });
    return this.toDomain(row);
  }
}
