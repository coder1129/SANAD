import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import {
  PaymentsController,
  AdminPaymentsController,
} from './payments.controller';
import { MockPaymentProvider } from './providers/mock-payment.provider';

@Module({
  controllers: [PaymentsController, AdminPaymentsController],
  providers: [PaymentsService, MockPaymentProvider],
  exports: [PaymentsService, MockPaymentProvider],
})
export class PaymentsModule {}
