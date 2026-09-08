import { Module } from '@nestjs/common';
import { TestimonialsDashboardController } from './testimonials-dashboard.controller';
import { TestimonialsPublicController } from './testimonials-public.controller';
import { TestimonialService } from './testimonial.service';
import { ModerationService } from './moderation.service';
import { CsvImportService } from './csv-import.service';

@Module({
  controllers: [TestimonialsDashboardController, TestimonialsPublicController],
  providers: [TestimonialService, ModerationService, CsvImportService],
  exports: [TestimonialService, ModerationService],
})
export class TestimonialsModule {}
