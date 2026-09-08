import { Injectable } from '@nestjs/common';
import type { AppStats, CreateAppStats, IAppStatsRepository } from '@testimonial-api/domain';
import { FirestoreClient } from '../firestore.client';
import { AppStatsFirestoreMapper } from '../mappers/app-stats.mapper';
import { TestimonialFirestoreMapper } from '../mappers/testimonial.mapper';

/**
 * appStats documents use appId as the DOC ID (PK-shaped). The generic base
 * generates random ids, so this repo manages the doc key explicitly.
 */
@Injectable()
export class FirestoreAppStatsRepository implements IAppStatsRepository {
  private readonly col = () => this.client.db.collection('appStats');

  constructor(private readonly client: FirestoreClient) {}

  private toDomain(id: string, data: Record<string, unknown>): AppStats {
    const base = AppStatsFirestoreMapper.toDomain({ id, data });
    return { ...base, appId: id } as AppStats;
  }

  async findByApp(appId: string): Promise<AppStats | null> {
    const snap = await this.col().doc(appId).get();
    if (!snap.exists) return null;
    return this.toDomain(snap.id, snap.data() ?? {});
  }

  async upsert(appId: string, data: Partial<CreateAppStats>): Promise<AppStats> {
    const payload = AppStatsFirestoreMapper.toPersistence({
      ...data,
      updatedAt: new Date(),
    } as Partial<AppStats>);
    await this.col().doc(appId).set(payload, { merge: true });
    const result = await this.findByApp(appId);
    if (!result) throw new Error(`appStats upsert failed for app ${appId}`);
    return result;
  }

  async recompute(appId: string): Promise<AppStats> {
    const snap = await this.client.db.collection('testimonials').where('appId', '==', appId).get();
    const live = snap.docs
      .map((d) => TestimonialFirestoreMapper.toDomain({ id: d.id, data: d.data() }))
      .filter((t) => !t.deletedAt);
    const approved = live.filter((t) => t.status === 'approved');
    const pending = live.filter((t) => t.status === 'pending');
    const rated = approved.filter((t) => t.rating !== null);
    const avgRating = rated.length ? rated.reduce((s, t) => s + (t.rating ?? 0), 0) / rated.length : 0;
    const bySource: Record<string, number> = {};
    const byMonth: Record<string, number> = {};
    for (const t of live) {
      bySource[t.source] = (bySource[t.source] ?? 0) + 1;
      const key = `${t.createdAt.getUTCFullYear()}-${String(t.createdAt.getUTCMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] ?? 0) + 1;
    }
    return this.upsert(appId, {
      totalTestimonials: live.length,
      approvedCount: approved.length,
      pendingCount: pending.length,
      avgRating: Math.round(avgRating * 100) / 100,
      bySource,
      byMonth,
    });
  }
}
