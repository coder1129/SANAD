import { Module } from '@nestjs/common';
import { TestimonialsService } from './testimonials.service';
import {
  TestimonialsController,
  AdminTestimonialsController,
} from './testimonials.controller';

@Module({
  controllers: [TestimonialsController, AdminTestimonialsController],
  providers: [TestimonialsService],
  exports: [TestimonialsService],
})
export class TestimonialsModule {}
