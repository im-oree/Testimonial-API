import { Module } from '@nestjs/common';
import { WidgetsDashboardController } from './widgets-dashboard.controller';
import { WidgetsPublicController } from './widgets-public.controller';
import { WidgetsService } from './widgets.service';

@Module({
  controllers: [WidgetsDashboardController, WidgetsPublicController],
  providers: [WidgetsService],
  exports: [WidgetsService],
})
export class WidgetsModule {}
