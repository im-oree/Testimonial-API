import type { CreateUser, User } from '../entities/user.entity';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUser): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User>;
}
