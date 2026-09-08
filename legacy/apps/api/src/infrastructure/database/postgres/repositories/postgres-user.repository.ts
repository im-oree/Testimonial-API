import { Injectable } from '@nestjs/common';
import type { CreateUser, IUserRepository, User } from '@testimonial-api/domain';
import { PrismaClientService } from '../prisma.client';
import { UserPgMappers } from '../mappers/user.mapper';

@Injectable()
export class PostgresUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClientService) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? (UserPgMappers.toDomain(row as unknown as Record<string, unknown>) as User) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email } });
    return row ? (UserPgMappers.toDomain(row as unknown as Record<string, unknown>) as User) : null;
  }

  async create(data: CreateUser): Promise<User> {
    const row = await this.prisma.user.create({
      data: { ...UserPgMappers.toPersistence(data as Partial<User>) } as never,
    });
    return UserPgMappers.toDomain(row as unknown as Record<string, unknown>) as User;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const row = await this.prisma.user.update({
      where: { id },
      data: { ...UserPgMappers.toPersistence(data) } as never,
    });
    return UserPgMappers.toDomain(row as unknown as Record<string, unknown>) as User;
  }
}
