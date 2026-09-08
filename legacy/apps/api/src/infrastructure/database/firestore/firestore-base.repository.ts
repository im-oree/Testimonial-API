import type { FirestoreClient } from './firestore.client';
import type { PaginatedResult, PaginationParams } from '@testimonial-api/domain';
import type { Query } from 'firebase-admin/firestore';
import { randomUUID } from 'crypto';

/**
 * Generic Firestore CRUD plumbing shared by every Firestore repository.
 *
 * Collections are FLAT TOP-LEVEL with denormalized foreign keys
 * (docs/01-skeleton.md §7) — deliberately no deep nesting, so the
 * SQL migration stays a 1:1 copy rather than a redesign.
 *
 * Subclasses supply the collection name and the two mapper functions;
 * entities are serialized camelCase with Date <-> Timestamp handled by
 * the per-entity mappers passed in.
 */
/**
 * Note on entity identity: Firestore repo types are deliberately NOT
 * constrained to shapes with an `id` property — most entities carry a UUID
 * `id`, but Invite is keyed by its token and appStats by appId. The base
 * repo writes `doc(entity.id ?? randomUUID())`; repos with a different
 * natural key pass it through their own create() (see FirestoreInviteRepository).
 */
export interface FirestoreMapper<T> {
  toDomain(doc: { id: string; data: Record<string, unknown> }): T;
  /** Strips id/createdAt/updatedAt management fields; converts Date→Timestamp. */
  toPersistence(entity: Partial<T>): Record<string, unknown>;
}

export abstract class FirestoreBaseRepository<T> {
  protected abstract readonly collectionName: string;
  protected abstract readonly mapper: FirestoreMapper<T>;

  constructor(protected readonly client: FirestoreClient) {}

  protected col() {
    return this.client.db.collection(this.collectionName);
  }

  async findById(id: string): Promise<T | null> {
    const snap = await this.col().doc(id).get();
    if (!snap.exists) return null;
    return this.mapper.toDomain({ id: snap.id, data: snap.data() ?? {} });
  }

  protected async findByField(field: string, value: unknown): Promise<T | null> {
    const snap = await this.col().where(field, '==', value).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return this.mapper.toDomain({ id: doc.id, data: doc.data() });
  }

  /** If the entity has timestamp fields, stamp them on create/update. */
  protected timestampKeys(): Array<'createdAt' | 'updatedAt'> {
    // Presence check is done via the mapper spec: extra keys are ignored by
    // toPersistence, so stamping here is safe for entities without them.
    return ['createdAt', 'updatedAt'];
  }

  /** Prototype-only: Firestore has no DB column defaults — repos fill them here. */
  protected defaultsFor(_entity: Partial<T>): Partial<T> {
    return {};
  }

  async create(entity: Partial<T> & { id?: string }): Promise<T> {
    const now = new Date();
    const id = entity.id ?? randomUUID();
    const merged = { ...this.defaultsFor(entity), ...entity, id } as Partial<T> & { id: string };
    const payload = this.mapper.toPersistence({
      ...merged,
      createdAt: (merged as { createdAt?: Date }).createdAt ?? now,
      updatedAt: now,
    } as Partial<T>);
    await this.col().doc(id).set({ ...payload });
    const created = await this.findById(id);
    if (!created) throw new Error(`Firestore write failed silently for ${this.collectionName}/${id}`);
    return created;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const payload = this.mapper.toPersistence({ ...data, updatedAt: new Date() } as Partial<T>);
    if (Object.keys(payload).length === 0) {
      const existing = await this.findById(id);
      if (!existing) throw new Error(`Firestore update failed for missing ${this.collectionName}/${id}`);
      return existing;
    }
    await this.col().doc(id).update(payload);
    const updated = await this.findById(id);
    if (!updated) throw new Error(`Firestore update failed for missing ${this.collectionName}/${id}`);
    return updated;
  }

  async deleteHard(id: string): Promise<void> {
    await this.col().doc(id).delete();
  }

  /** Soft delete via deletedAt marker (matches SQL soft-delete semantics). */
  async softDelete(id: string): Promise<void> {
    await this.col().doc(id).update({ deletedAt: new Date(), updatedAt: new Date() });
  }

  async paginateAll(pagination: PaginationParams): Promise<PaginatedResult<T>> {
    const base = this.col()
      .orderBy(pagination.sortBy ?? 'createdAt', (pagination.sortDir ?? 'desc') as 'asc' | 'desc')
      .offset((pagination.page - 1) * pagination.pageSize)
      .limit(pagination.pageSize);
    const [snap, countSnap] = await Promise.all([base.get(), this.col().count().get()]);
    const items = snap.docs.map((d) => this.mapper.toDomain({ id: d.id, data: d.data() }));
    return { items, total: countSnap.data().count, page: pagination.page, pageSize: pagination.pageSize };
  }

  protected withDefaults(pagination: PaginationParams): Required<PaginationParams> {
    return {
      page: pagination.page ?? 1,
      pageSize: pagination.pageSize ?? 20,
      sortBy: pagination.sortBy ?? 'createdAt',
      sortDir: pagination.sortDir ?? 'desc',
    };
  }

  /** Fetch every doc where field == value (single-field equality → single-field index). */
  protected async fetchAll(field: string, value: unknown): Promise<T[]> {
    const snap = await this.col().where(field, '==', value).get();
    return snap.docs.map((d) => this.mapper.toDomain({ id: d.id, data: d.data() }));
  }

  protected async fetchAllWhere(whereFn: (q: Query) => Query): Promise<T[]> {
    const snap = await whereFn(this.col()).get();
    return snap.docs.map((d) => this.mapper.toDomain({ id: d.id, data: d.data() }));
  }

  /** Prototype-scale in-memory pagination. The SQL adapter paginates server-side. */
  protected pageInMemory(items: T[], pagination: PaginationParams): PaginatedResult<T> {
    const p = this.withDefaults(pagination);
    const sortKey = p.sortBy;
    const sorted = [...items].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey];
      const bv = (b as Record<string, unknown>)[sortKey];
      if (av === undefined && bv === undefined) return 0;
      if (av === undefined) return 1;
      if (bv === undefined) return -1;
      // Mapper outputs are strings/numbers/dates/booleans — normalize to a
      // comparable primitive before ordering.
      const avn: string | number = av instanceof Date ? av.getTime() : typeof av === 'string' ? av : (av as number);
      const bvn: string | number = bv instanceof Date ? bv.getTime() : typeof bv === 'string' ? bv : (bv as number);
      const cmp = avn < bvn ? -1 : avn > bvn ? 1 : 0;
      return p.sortDir === 'desc' ? -cmp : cmp;
    });
    const start = (p.page - 1) * p.pageSize;
    return {
      items: sorted.slice(start, start + p.pageSize),
      total: sorted.length,
      page: p.page,
      pageSize: p.pageSize,
    };
  }
}
