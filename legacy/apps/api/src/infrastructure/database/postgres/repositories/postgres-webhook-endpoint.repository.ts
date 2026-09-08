import { Injectable } from '@nestjs/common';
import type {
  CreateWebhookEndpoint,
  IWebhookEndpointRepository,
  PaginatedResult,
  PaginationParams,
  WebhookEndpoint,
} from '@testimonial-api/domain';
import { PrismaClientService } from '../prisma.client';
import { WebhookEndpointPgMappers } from '../mappers/webhook-endpoint.mapper';

@Injectable()
export class PostgresWebhookEndpointRepository implements IWebhookEndpointRepository {
  constructor(private readonly prisma: PrismaClientService) {}

  private toDomain(row: unknown): WebhookEndpoint {
    return WebhookEndpointPgMappers.toDomain(row as Record<string, unknown>) as WebhookEndpoint;
  }

  async findById(id: string): Promise<WebhookEndpoint | null> {
    const row = await this.prisma.webhookEndpoint.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByApp(appId: string, pagination: PaginationParams): Promise<PaginatedResult<WebhookEndpoint>> {
    const page = Math.max(1, pagination.page);
    const pageSize = Math.min(100, pagination.pageSize);
    const where = { app_id: appId };
    const [rows, total] = await Promise.all([
      this.prisma.webhookEndpoint.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { created_at: 'desc' } }),
      this.prisma.webhookEndpoint.count({ where }),
    ]);
    return { items: rows.map((r) => this.toDomain(r)), total, page, pageSize };
  }

  async findActiveByAppAndEvent(appId: string, event: string): Promise<WebhookEndpoint[]> {
    const rows = await this.prisma.webhookEndpoint.findMany({
      where: { app_id: appId, status: 'active' },
    });
    return rows.filter((r) => r.events.includes(event)).map((r) => this.toDomain(r));
  }

  async create(data: CreateWebhookEndpoint): Promise<WebhookEndpoint> {
    const row = await this.prisma.webhookEndpoint.create({
      data: WebhookEndpointPgMappers.toPersistence(data as Partial<WebhookEndpoint>) as never,
    });
    return this.toDomain(row);
  }

  async update(id: string, data: Partial<WebhookEndpoint>): Promise<WebhookEndpoint> {
    const row = await this.prisma.webhookEndpoint.update({
      where: { id },
      data: WebhookEndpointPgMappers.toPersistence(data) as never,
    });
    return this.toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.webhookEndpoint.delete({ where: { id } });
  }

  async incrementFailureCount(id: string): Promise<void> {
    await this.prisma.webhookEndpoint.update({ where: { id }, data: { failure_count: { increment: 1 } } });
  }

  async resetFailureCount(id: string): Promise<void> {
    await this.prisma.webhookEndpoint.update({ where: { id }, data: { failure_count: 0 } });
  }
}
