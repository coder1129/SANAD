import { Module } from '@nestjs/common';
import { PackagesService } from './packages.service';
import {
  PackagesController,
  AdminPackagesController,
} from './packages.controller';

@Module({
  controllers: [PackagesController, AdminPackagesController],
  providers: [PackagesService],
  exports: [PackagesService],
})
export class PackagesModule {}
