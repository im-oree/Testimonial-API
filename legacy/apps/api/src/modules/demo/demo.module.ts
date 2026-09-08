import { Module } from '@nestjs/common';
import { DemoController } from './demo.controller';

/**
 * DEV-ONLY local demo module (2026-09-08) — see demo-data.ts header.
 * Provides in-memory auth + seeded data routes so the website is testable
 * before the real Doc-3 REST slice / LIVE (PostgreSQL) engine are wired.
 * Remove when the real controllers land.
 */
@Module({
  controllers: [DemoController],
})
export class DemoModule {}
