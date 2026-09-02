import { Module } from '@nestjs/common';
import { PagesService } from './pages.service';
import { PagesController, AdminPagesController } from './pages.controller';

@Module({
  controllers: [PagesController, AdminPagesController],
  providers: [PagesService],
  exports: [PagesService],
})
export class PagesModule {}
