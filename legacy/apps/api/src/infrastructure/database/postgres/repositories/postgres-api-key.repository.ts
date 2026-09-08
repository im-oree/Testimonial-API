import { Injectable } from '@nestjs/common';
import type { ApiKey, ApiKeyEnvironment, CreateApiKey, IApiKeyRepository } from '@testimonial-api/domain';
import { PrismaClientService } from '../prisma.client';
import { ApiKeyPgMappers } from '../mappers/api-key.mapper';

@Injectable()
export class PostgresApiKeyRepository implements IApiKeyRepository {
  constructor(private readonly prisma: PrismaClientService) {}

  private toDomain(row: unknown): ApiKey {
    return ApiKeyPgMappers.toDomain(row as Record<string, unknown>) as ApiKey;
  }

  async findByHash(hash: string): Promise<ApiKey | null> {
    const row = await this.prisma.apiKey.findFirst({ where: { key_hash: hash } });
    return row ? this.toDomain(row) : null;
  }

  async findByPublicValue(value: string): Promise<ApiKey | null> {
    const row = await this.prisma.apiKey.findFirst({ where: { plain_value: value } });
    return row ? this.toDomain(row) : null;
  }

  async findByApp(appId: string): Promise<ApiKey[]> {
    const rows = await this.prisma.apiKey.findMany({ where: { app_id: appId }, orderBy: { version: 'desc' } });
    return rows.map((r) => this.toDomain(r));
  }

  async findActiveSecret(appId: string, environment: ApiKeyEnvironment): Promise<ApiKey | null> {
    const row = await this.prisma.apiKey.findFirst({
      where: { app_id: appId, type: 'secret', environment, status: 'active' },
    });
    return row ? this.toDomain(row) : null;
  }

  async create(data: CreateApiKey): Promise<ApiKey> {
    const row = await this.prisma.apiKey.create({ data: ApiKeyPgMappers.toPersistence(data as Partial<ApiKey>) as never });
    return this.toDomain(row);
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.apiKey.update({ where: { id }, data: { status: 'revoked', revoked_at: new Date() } });
  }

  async touchLastUsed(id: string): Promise<void> {
    await this.prisma.apiKey.update({ where: { id }, data: { last_used_at: new Date() } });
  }
}
