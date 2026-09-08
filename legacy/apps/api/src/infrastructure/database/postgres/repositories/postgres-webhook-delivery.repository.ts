import { Injectable } from '@nestjs/common';
import type {
  CreateWebhookDelivery,
  IWebhookDeliveryRepository,
  PaginatedResult,
  PaginationParams,
  WebhookDelivery,
} from '@testimonial-api/domain';
import { PrismaClientService } from '../prisma.client';
import { WebhookDeliveryPgMappers } from '../mappers/webhook-delivery.mapper';

@Injectable()
export class PostgresWebhookDeliveryRepository implements IWebhookDeliveryRepository {
  constructor(private readonly prisma: PrismaClientService) {}

  private toDomain(row: unknown): WebhookDelivery {
    return WebhookDeliveryPgMappers.toDomain(row as Record<string, unknown>) as WebhookDelivery;
  }

  async findById(id: string): Promise<WebhookDelivery | null> {
    const row = await this.prisma.webhookDelivery.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByEndpoint(endpointId: string, pagination: PaginationParams): Promise<PaginatedResult<WebhookDelivery>> {
    const page = Math.max(1, pagination.page);
    const pageSize = Math.min(100, pagination.pageSize);
    const where = { webhook_endpoint_id: endpointId };
    const [rows, total] = await Promise.all([
      this.prisma.webhookDelivery.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { created_at: 'desc' } }),
      this.prisma.webhookDelivery.count({ where }),
    ]);
    return { items: rows.map((r) => this.toDomain(r)), total, page, pageSize };
  }

  async findDueForRetry(limit: number, now: Date = new Date()): Promise<WebhookDelivery[]> {
    const rows = await this.prisma.webhookDelivery.findMany({
      where: { status: { in: ['pending', 'retrying'] }, OR: [{ next_retry_at: null }, { next_retry_at: { lte: now } }] },
      orderBy: { created_at: 'asc' },
      take: limit,
    });
    return rows.map((r) => this.toDomain(r));
  }

  async create(data: CreateWebhookDelivery): Promise<WebhookDelivery> {
    const row = await this.prisma.webhookDelivery.create({
      data: WebhookDeliveryPgMappers.toPersistence(data as Partial<WebhookDelivery>) as never,
    });
    return this.toDomain(row);
  }

  async update(id: string, data: Partial<WebhookDelivery>): Promise<WebhookDelivery> {
    const row = await this.prisma.webhookDelivery.update({
      where: { id },
      data: WebhookDeliveryPgMappers.toPersistence(data) as never,
    });
    return this.toDomain(row);
  }
}
