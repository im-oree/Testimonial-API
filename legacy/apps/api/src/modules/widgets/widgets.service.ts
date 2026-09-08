import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@testimonial-api/domain';
import type { CreateWidget, IWidgetRepository, Widget } from '@testimonial-api/domain';

/**
 * WidgetsService — widget instances of templates + filters + style
 * (README §14). Public render config (template merge + live testimonials)
 * is served by widgets-public controller + Doc 3.
 */
@Injectable()
export class WidgetsService {
  constructor(
    @Inject(REPOSITORY_TOKENS.WIDGET) private readonly widgets: IWidgetRepository,
  ) {}

  async create(appId: string, input: Omit<CreateWidget, 'appId'>): Promise<Widget> {
    return this.widgets.create({ ...input, appId });
  }
}
