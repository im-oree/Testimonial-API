import { Injectable } from '@nestjs/common';

/**
 * TwitterService — X/Twitter import integration (README §17.1): worker cron
 * queries recent-search, LLM classifies, candidates ALWAYS land in the
 * moderation queue (never auto-published). OAuth + scraping: Doc 2/3.
 */
@Injectable()
export class TwitterService {
  // searchAndClassify(integrationId) — Doc 2/3 (worker processor wraps this)
}
