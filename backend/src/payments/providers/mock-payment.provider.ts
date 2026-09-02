import { Injectable, BadRequestException } from '@nestjs/common';
import {
  PaymentProvider,
  CreatePaymentParams,
  PaymentIntentResult,
  WebhookEventPayload,
} from '../interfaces/payment-provider.interface';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  private readonly secretKey: string;
  private readonly frontendUrl: string;

  constructor(configService: ConfigService) {
    this.secretKey = configService.getOrThrow<string>('PAYMENT_WEBHOOK_SECRET');
    this.frontendUrl =
      configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
  }

  async createPaymentIntent(
    params: CreatePaymentParams,
  ): Promise<PaymentIntentResult> {
    const transactionId = `txn_${Date.now()}_${uuidv4().substring(0, 8)}`;
    const paymentUrl = `${this.frontendUrl}/checkout/pay?txn=${transactionId}&orderId=${params.orderId}&amount=${params.amount}`;

    return {
      transactionId,
      paymentUrl,
      provider: 'mock_gateway',
      amount: params.amount,
      currency: params.currency,
    };
  }

  async verifyWebhook(
    payload: any,
    signature: string,
    rawBody: Buffer,
  ): Promise<WebhookEventPayload> {
    if (!payload || !payload.transaction_id || !payload.order_id) {
      throw new BadRequestException({
        message: 'Invalid webhook payload structure',
        code: 'INVALID_WEBHOOK_PAYLOAD',
      });
    }

    if (!signature || !rawBody?.length) {
      throw new BadRequestException({
        message: 'Missing webhook signature',
        code: 'MISSING_WEBHOOK_SIGNATURE',
      });
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(rawBody)
      .digest('hex');
    const provided = Buffer.from(signature.trim().toLowerCase(), 'utf8');
    const expected = Buffer.from(expectedSignature, 'utf8');

    if (
      provided.length !== expected.length ||
      !crypto.timingSafeEqual(provided, expected)
    ) {
      throw new BadRequestException({
        message: 'Invalid webhook signature',
        code: 'INVALID_WEBHOOK_SIGNATURE',
      });
    }

    const status =
      payload.status === 'paid' ||
      payload.status === 'completed' ||
      payload.status === 'success'
        ? 'paid'
        : 'failed';

    return {
      transactionId: payload.transaction_id,
      orderId: Number(payload.order_id),
      status,
      amount: Number(payload.amount),
      currency: payload.currency || 'AED',
      rawPayload: payload,
    };
  }
}
