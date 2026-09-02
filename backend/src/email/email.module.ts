import { Module, Global } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailService } from './email.service';
import { EmailWorker } from './email.worker';

@Global()
@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [EmailService, EmailWorker],
  exports: [EmailService],
})
export class EmailModule {}
