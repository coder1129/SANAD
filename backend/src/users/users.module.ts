import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { AdministratorsController, UsersController } from './users.controller';

@Module({
  controllers: [UsersController, AdministratorsController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
