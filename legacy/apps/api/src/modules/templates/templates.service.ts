import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@testimonial-api/domain';
import type { ITemplateRepository, Template, TemplateType } from '@testimonial-api/domain';

/**
 * TemplatesService — global platform-managed blueprints (widgets & forms,
 * README §14). Versioning: templates are immutable-ish; new versions ship
 * with componentRef + configSchema; widgets pin templateVersion.
 */
@Injectable()
export class TemplatesService {
  constructor(
    @Inject(REPOSITORY_TOKENS.TEMPLATE) private readonly templates: ITemplateRepository,
  ) {}

  async findActiveByType(type: TemplateType): Promise<Template[]> {
    return this.templates.findActiveByType(type);
  }
}
