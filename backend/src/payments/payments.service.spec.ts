import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { MockPaymentProvider } from './providers/mock-payment.provider';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: any;
  let configService: any;
  const webhookSecret = 'unit_test_webhook_secret_at_least_32_chars';

  const sign = (payload: Record<string, unknown>) => {
    const rawBody = Buffer.from(JSON.stringify(payload));
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');
    return { rawBody, signature };
  };

  beforeEach(() => {
    prisma = {
      orders: {
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      payments: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      order_status_history: { create: vi.fn() },
      notifications: { create: vi.fn() },
      email_queue: { create: vi.fn() },
      $queryRaw: vi.fn(),
      $transaction: vi.fn(async (callback) => callback(prisma)),
    };

    configService = {
      getOrThrow: vi.fn().mockReturnValue(webhookSecret),
      get: vi.fn((key: string) =>
        key === 'PAYMENT_PROVIDER' ? 'mock' : 'http://localhost:3001',
      ),
    };
    const provider = new MockPaymentProvider(
      configService as unknown as ConfigService,
    );
    service = new PaymentsService(
      prisma as PrismaService,
      provider,
      configService as ConfigService,
    );
  });

  describe('createPayment', () => {
    it('confirms a pending order with zero charged amount in bypass mode', async () => {
      configService.get.mockImplementation((key: string) =>
        key === 'PAYMENT_PROVIDER' ? 'bypass' : 'http://localhost:3001',
      );
      prisma.orders.findUnique.mockResolvedValue({
        id: 7,
        order_number: 'SANAD-2026-000007',
        user_id: 10,
        status: 'pending',
        final_amount: 500,
        customer_name: 'Test Customer',
        customer_email: 'test@example.com',
        customer_phone: '+971500000000',
        package: {},
      });
      prisma.payments.create.mockImplementation(async ({ data }: any) => ({
        id: 70,
        ...data,
      }));

      const result = await service.createPayment(10, { order_id: 7 });

      expect(result).toMatchObject({
        payment_id: 70,
        amount: 500,
        charged_amount: 0,
        status: 'paid',
        bypassed: true,
        requires_payment: false,
      });
      expect(prisma.payments.updateMany).toHaveBeenCalledWith({
        where: { order_id: 7, status: 'pending' },
        data: { status: 'failed', payment_date: expect.any(Date) },
      });
      expect(prisma.payments.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: 0,
            payment_method: 'other',
            status: 'paid',
          }),
        }),
      );
      expect(prisma.orders.updateMany).toHaveBeenCalledWith({
        where: {
          id: 7,
          status: { in: ['pending', 'pending_payment'] },
        },
        data: { status: 'paid' },
      });
    });

    it('reuses the bypass record created with the order', async () => {
      configService.get.mockImplementation((key: string) =>
        key === 'PAYMENT_PROVIDER' ? 'bypass' : 'http://localhost:3001',
      );
      prisma.orders.findUnique.mockResolvedValue({
        id: 8,
        order_number: 'SANAD-2026-000008',
        user_id: 10,
        status: 'paid',
        final_amount: 750,
        package: {},
      });
      prisma.payments.findFirst.mockResolvedValue({
        id: 80,
        transaction_id: 'bypass_existing',
        currency: 'AED',
      });

      const result = await service.createPayment(10, { order_id: 8 });

      expect(result).toMatchObject({
        payment_id: 80,
        amount: 750,
        charged_amount: 0,
        bypassed: true,
        reused: true,
      });
      expect(prisma.payments.create).not.toHaveBeenCalled();
    });
  });

  describe('handleWebhook', () => {
    it('is idempotent only after validating signature and transaction details', async () => {
      prisma.payments.findUnique.mockResolvedValue({
        id: 1,
        order_id: 1,
        transaction_id: 'txn_123',
        amount: 500,
        currency: 'AED',
        status: 'paid',
      });
      prisma.orders.findUnique.mockResolvedValue({
        id: 1,
        final_amount: 500,
        status: 'paid',
      });
      const payload = {
        transaction_id: 'txn_123',
        order_id: 1,
        status: 'paid',
        amount: 500,
        currency: 'AED',
      };
      const signed = sign(payload);

      const result = await service.handleWebhook(
        payload,
        signed.signature,
        signed.rawBody,
      );

      expect(result.idempotent).toBe(true);
      expect(prisma.orders.updateMany).not.toHaveBeenCalled();
    });

    it('rejects an amount that is not exactly the intent and order amount', async () => {
      prisma.payments.findUnique.mockResolvedValue({
        id: 1,
        order_id: 1,
        transaction_id: 'txn_123',
        amount: 500,
        currency: 'AED',
        status: 'pending',
      });
      prisma.orders.findUnique.mockResolvedValue({
        id: 1,
        final_amount: 500,
        status: 'pending',
      });
      const payload = {
        transaction_id: 'txn_123',
        order_id: 1,
        status: 'paid',
        amount: 100,
        currency: 'AED',
      };
      const signed = sign(payload);

      await expect(
        service.handleWebhook(payload, signed.signature, signed.rawBody),
      ).rejects.toThrow(BadRequestException);
    });

    it('processes a valid payment and transitions the order to paid', async () => {
      prisma.payments.findUnique.mockResolvedValue({
        id: 1,
        order_id: 1,
        transaction_id: 'txn_valid_999',
        amount: 500,
        currency: 'AED',
        status: 'pending',
      });
      prisma.orders.findUnique.mockResolvedValue({
        id: 1,
        order_number: 'SANAD-2026-000001',
        final_amount: 500,
        status: 'pending',
        user_id: 10,
        customer_name: 'Test Customer',
        customer_email: 'test@example.com',
      });
      const payload = {
        transaction_id: 'txn_valid_999',
        order_id: 1,
        status: 'paid',
        amount: 500,
        currency: 'AED',
      };
      const signed = sign(payload);

      const result = await service.handleWebhook(
        payload,
        signed.signature,
        signed.rawBody,
      );

      expect(result.processed).toBe(true);
      expect(prisma.orders.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 1 }),
          data: { status: 'paid' },
        }),
      );
    });

    it('rejects an invalid HMAC signature before querying payment data', async () => {
      const payload = {
        transaction_id: 'txn_bad_signature',
        order_id: 1,
        status: 'paid',
        amount: 500,
        currency: 'AED',
      };

      await expect(
        service.handleWebhook(
          payload,
          '0'.repeat(64),
          Buffer.from(JSON.stringify(payload)),
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.payments.findUnique).not.toHaveBeenCalled();
    });

    it('rejects a transaction replayed against another order', async () => {
      prisma.payments.findUnique.mockResolvedValue({
        id: 1,
        order_id: 2,
        transaction_id: 'txn_replayed',
        amount: 500,
        currency: 'AED',
        status: 'pending',
      });
      const payload = {
        transaction_id: 'txn_replayed',
        order_id: 1,
        status: 'paid',
        amount: 500,
        currency: 'AED',
      };
      const signed = sign(payload);

      await expect(
        service.handleWebhook(payload, signed.signature, signed.rawBody),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.orders.findUnique).not.toHaveBeenCalled();
    });

    it('ignores a valid late webhook for an invalidated payment session', async () => {
      prisma.payments.findUnique.mockResolvedValue({
        id: 1,
        order_id: 1,
        transaction_id: 'txn_superseded',
        amount: 500,
        currency: 'AED',
        status: 'failed',
      });
      prisma.orders.findUnique.mockResolvedValue({
        id: 1,
        final_amount: 500,
        status: 'paid',
      });
      const payload = {
        transaction_id: 'txn_superseded',
        order_id: 1,
        status: 'paid',
        amount: 500,
        currency: 'AED',
      };
      const signed = sign(payload);

      const result = await service.handleWebhook(
        payload,
        signed.signature,
        signed.rawBody,
      );

      expect(result).toMatchObject({
        received: true,
        idempotent: true,
        ignored: true,
      });
      expect(prisma.payments.updateMany).not.toHaveBeenCalled();
    });
  });
});
