import { Injectable } from '@nestjs/common';
import type { CreateInvite, Invite, IInviteRepository, PaginatedResult, PaginationParams } from '@testimonial-api/domain';
import { FirestoreBaseRepository } from '../firestore-base.repository';
import { FirestoreClient } from '../firestore.client';
import { InviteFirestoreMapper } from '../mappers/invite.mapper';

@Injectable()
export class FirestoreInviteRepository extends FirestoreBaseRepository<Invite> implements IInviteRepository {
  protected readonly collectionName = 'invites';
  protected readonly mapper = InviteFirestoreMapper;

  constructor(client: FirestoreClient) {
    super(client);
  }

  protected override defaultsFor(_e: Partial<Invite>): Partial<Invite> {
    return { revoked: false };
  }

  // Doc id IS the token (SQL: token PK). Domain Invite has no `id` — token is the id.
  override async findById(id: string): Promise<Invite | null> {
    const doc = await this.col().doc(id).get();
    if (!doc.exists) return null;
    const data = doc.data() ?? {};
    return { ...(InviteFirestoreMapper.toDomain({ id: doc.id, data }) as Invite), token: doc.id };
  }

  async findByToken(token: string): Promise<Invite | null> {
    return this.findById(token);
  }

  async findByEmail(email: string, pagination: PaginationParams): Promise<PaginatedResult<Invite>> {
    const all = await this.fetchAll('email', email);
    return this.pageInMemory(all, pagination);
  }

  async findValidByEmail(
    email: string,
    scope: 'platform' | 'tenant',
    tenantId: string | null,
  ): Promise<Invite | null> {
    const all = await this.fetchAll('email', email);
    const now = new Date();
    return (
      all.find(
        (i) =>
          i.scope === scope &&
          i.tenantId === tenantId &&
          !i.revoked &&
          !i.usedAt &&
          i.expiresAt > now,
      ) ?? null
    );
  }

  override create(data: CreateInvite): Promise<Invite> {
    // Invites are keyed by token (SQL PK / Firestore doc id) — mirror it so
    // findByToken (doc lookup) and the migration's 1:1 id copy both work.
    return super.create({ ...data, id: data.token });
  }

  async markUsed(token: string): Promise<void> {
    await this.col().doc(token).update({ usedAt: new Date() });
  }

  async revoke(token: string): Promise<void> {
    await this.col().doc(token).update({ revoked: true });
  }
}
