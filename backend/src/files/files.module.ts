import { Module, Global } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';

@Global()
@Module({
  // Order document endpoints are intentionally disabled. Customers provide
  // their requirements through WhatsApp; storage remains available for site
  // and package images managed by MediaModule.
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class FilesModule {}
