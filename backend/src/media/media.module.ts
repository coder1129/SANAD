import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController, AdminMediaController } from './media.controller';

@Module({
  controllers: [MediaController, AdminMediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
