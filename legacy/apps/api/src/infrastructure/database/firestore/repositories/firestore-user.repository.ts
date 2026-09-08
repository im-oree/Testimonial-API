import { Injectable } from '@nestjs/common';
import type { CreateUser, IUserRepository, User } from '@testimonial-api/domain';
import { FirestoreBaseRepository } from '../firestore-base.repository';
import { FirestoreClient } from '../firestore.client';
import { UserFirestoreMapper } from '../mappers/user.mapper';

@Injectable()
export class FirestoreUserRepository extends FirestoreBaseRepository<User> implements IUserRepository {
  protected readonly collectionName = 'users';
  protected readonly mapper = UserFirestoreMapper;

  constructor(client: FirestoreClient) {
    super(client);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.findByField('email', email);
  }

  override create(data: CreateUser): Promise<User> {
    return super.create(data as Partial<User>);
  }
}
