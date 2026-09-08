import { Module } from '@nestjs/common';
import { FormsDashboardController } from './forms-dashboard.controller';
import { FormsPublicController } from './forms-public.controller';
import { FormsService } from './forms.service';

@Module({
  controllers: [FormsDashboardController, FormsPublicController],
  providers: [FormsService],
  exports: [FormsService],
})
export class FormsModule {}
