import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      settings: {
        findMany: vi.fn().mockResolvedValue([]),
        upsert: vi.fn((args: unknown) => args),
      },
      $transaction: vi.fn().mockResolvedValue([]),
    };
    service = new SettingsService(prisma as PrismaService);
  });

  describe('getPublicSettings', () => {
    it('queries only the public allowlist', async () => {
      await service.getPublicSettings();

      const keys = prisma.settings.findMany.mock.calls[0][0].where.setting_key
        .in as string[];
      expect(keys).toContain('site_name');
      expect(keys).not.toContain('payment_secret_key');
      expect(keys).not.toContain('smtp_password');
    });

    it('applies fallbacks when the table is empty', async () => {
      const result = await service.getPublicSettings();

      expect(result.currency).toBe('AED');
      expect(result.site_name).toBeTruthy();
    });

    it('returns stored values as a flat dictionary', async () => {
      prisma.settings.findMany.mockResolvedValue([
        { setting_key: 'currency', setting_value: 'SAR' },
        { setting_key: 'support_email', setting_value: 'help@sanad.ae' },
      ]);

      const result = await service.getPublicSettings();

      expect(result.currency).toBe('SAR');
      expect(result.support_email).toBe('help@sanad.ae');
    });
  });

  describe('getAllAdmin', () => {
    it('does not expose developer or infrastructure settings', async () => {
      await service.getAllAdmin();

      const keys = prisma.settings.findMany.mock.calls[0][0].where.setting_key
        .in as string[];
      expect(keys).toContain('support_email');
      expect(keys).not.toContain('payment_secret_key');
      expect(keys).not.toContain('smtp_password');
    });
  });

  describe('bulkUpdate', () => {
    it('rejects more than 100 settings in one request', async () => {
      const settings: Record<string, string> = {};
      for (let index = 0; index < 101; index++) {
        settings[`key_${index}`] = 'value';
      }

      await expect(
        service.bulkUpdate({ settings } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects a key that is not a lowercase identifier', async () => {
      await expect(
        service.bulkUpdate({ settings: { 'Site Name': 'SANAD' } } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects a developer setting key', async () => {
      await expect(
        service.bulkUpdate({
          settings: { payment_secret_key: 'not-allowed' },
        } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects an object value', async () => {
      await expect(
        service.bulkUpdate({ settings: { site_name: { a: 1 } } } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a value longer than 10000 characters', async () => {
      await expect(
        service.bulkUpdate({
          settings: { site_name: 'x'.repeat(10_001) },
        } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });


    it('rejects a currency that is not a 3-letter uppercase code', async () => {
      await expect(
        service.bulkUpdate({ settings: { currency: 'aed' } } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an invalid central WhatsApp number', async () => {
      await expect(
        service.bulkUpdate({
          settings: { whatsapp_number: 'not-a-number' },
        } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('accepts a formatted international WhatsApp number', async () => {
      await service.bulkUpdate({
        settings: { whatsapp_number: '+971 50 000 0000' },
      } as never);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('rejects a social link with an unsafe protocol', async () => {
      await expect(
        service.bulkUpdate({
          settings: { instagram_url: 'javascript:alert(1)' },
        } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('upserts every valid entry inside one transaction', async () => {
      await service.bulkUpdate({
        settings: { site_name: 'SANAD', currency: 'AED' },
      } as never);

      expect(prisma.settings.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.$transaction.mock.calls[0][0]).toHaveLength(2);
    });

    it('validates every entry before writing any of them', async () => {
      await expect(
        service.bulkUpdate({
          settings: { site_name: 'SANAD', currency: 'invalid' },
        } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('upsertOne', () => {
    it('validates the key before writing', async () => {
      await expect(
        service.upsertOne({
          setting_key: 'BAD KEY',
          setting_value: 'x',
        } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('defaults the type to string', async () => {
      await service.upsertOne({
        setting_key: 'support_phone',
        setting_value: '+971500000000',
      } as never);

      expect(prisma.settings.upsert.mock.calls[0][0].create.setting_type).toBe(
        'string',
      );
    });
  });
});
