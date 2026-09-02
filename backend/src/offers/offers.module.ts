import { Module } from '@nestjs/common';
import { OffersService } from './offers.service';
import { OffersController, AdminOffersController } from './offers.controller';

@Module({
  controllers: [OffersController, AdminOffersController],
  providers: [OffersService],
  exports: [OffersService],
})
export class OffersModule {}
