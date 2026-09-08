import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@testimonial-api/domain';
import type {
  CollectionForm,
  CreateCollectionForm,
  ICollectionFormRepository,
} from '@testimonial-api/domain';

/**
 * FormsService — collection-form lifecycle (README §16). Public URL is
 * https://forms.host/{tenantSlug}/{formSlug}; submissions land in the
 * moderation queue. Submission pipeline details: Doc 2/3.
 */
@Injectable()
export class FormsService {
  constructor(
    @Inject(REPOSITORY_TOKENS.COLLECTION_FORM) private readonly forms: ICollectionFormRepository,
  ) {}

  async create(appId: string, input: Omit<CreateCollectionForm, 'appId'>): Promise<CollectionForm> {
    return this.forms.create({ ...input, appId });
  }
}
