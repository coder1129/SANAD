import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FilesService } from './files.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';
import { MAX_UPLOAD_BYTES } from './file-validation';

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46];

const pdfFile = (overrides: Record<string, unknown> = {}) =>
  ({
    originalname: 'My CV (final).pdf',
    mimetype: 'application/pdf',
    size: 4096,
    buffer: Buffer.from([...PDF_SIGNATURE, 0x2d, 0x31],),
    ...overrides,
  }) as never;

describe('FilesService', () => {
  let service: FilesService;
  let prisma: any;
  let storage: any;
  let tx: any;
  let config: any;

  const build = (maxFileSize?: number) => {
    config = { get: vi.fn().mockReturnValue(maxFileSize) };
    return new FilesService(
      prisma as PrismaService,
      storage as unknown as StorageService,
      config as ConfigService,
    );
  };

  beforeEach(() => {
    tx = {
      order_files: { create: vi.fn() },
      notifications: { create: vi.fn() },
    };
    prisma = {
      orders: { findUnique: vi.fn() },
      order_files: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        delete: vi.fn(),
      },
      $transaction: vi.fn(async (input: any) =>
        typeof input === 'function' ? input(tx) : Promise.all(input),
      ),
    };
    storage = {
      upload: vi.fn(async (key: string) => ({ key, url: `/${key}`, size: 10 })),
      getSignedUrl: vi.fn(async (key: string) => `signed:${key}`),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    service = build(10 * 1024 * 1024);
  });

  describe('size ceiling', () => {
    it('clamps a configured limit above the hard maximum', async () => {
      service = build(500 * 1024 * 1024);
      prisma.orders.findUnique.mockResolvedValue({ id: 1, user_id: 7 });

      await expect(
        service.uploadCustomerFile(
          1,
          7,
          pdfFile({ size: MAX_UPLOAD_BYTES + 1 }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('honours a configured limit below the hard maximum', async () => {
      service = build(1024);
      prisma.orders.findUnique.mockResolvedValue({ id: 1, user_id: 7 });

      await expect(
        service.uploadCustomerFile(1, 7, pdfFile({ size: 2048 })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('uploadCustomerFile', () => {
    it('throws NotFoundException for an unknown order', async () => {
      prisma.orders.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadCustomerFile(1, 7, pdfFile()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("refuses to attach a file to another customer's order", async () => {
      prisma.orders.findUnique.mockResolvedValue({ id: 1, user_id: 99 });

      await expect(
        service.uploadCustomerFile(1, 7, pdfFile()),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(storage.upload).not.toHaveBeenCalled();
    });

    it('rejects an unsupported format', async () => {
      prisma.orders.findUnique.mockResolvedValue({ id: 1, user_id: 7 });

      await expect(
        service.uploadCustomerFile(
          1,
          7,
          pdfFile({ mimetype: 'application/x-msdownload' }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects content whose magic bytes contradict its declared type', async () => {
      prisma.orders.findUnique.mockResolvedValue({ id: 1, user_id: 7 });

      await expect(
        service.uploadCustomerFile(
          1,
          7,
          pdfFile({ buffer: Buffer.from('<?php echo 1; ?>') }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('strips unsafe characters out of the storage key', async () => {
      prisma.orders.findUnique.mockResolvedValue({ id: 1, user_id: 7 });
      prisma.order_files.create.mockResolvedValue({
        id: 5,
        file_path: 'stored',
      });

      await service.uploadCustomerFile(1, 7, pdfFile());

      expect(storage.upload.mock.calls[0][0]).toMatch(
        /^orders\/1\/customer\/[a-f0-9-]{36}-My_CV__final_\.pdf$/,
      );
    });

    it('preserves the original filename in the database row', async () => {
      prisma.orders.findUnique.mockResolvedValue({ id: 1, user_id: 7 });
      prisma.order_files.create.mockResolvedValue({
        id: 5,
        file_path: 'stored',
      });

      await service.uploadCustomerFile(1, 7, pdfFile());

      expect(prisma.order_files.create.mock.calls[0][0].data.file_name).toBe(
        'My CV (final).pdf',
      );
    });

    it('removes the uploaded object when the database row cannot be written', async () => {
      prisma.orders.findUnique.mockResolvedValue({ id: 1, user_id: 7 });
      prisma.order_files.create.mockRejectedValue(new Error('write failed'));

      await expect(service.uploadCustomerFile(1, 7, pdfFile())).rejects.toThrow(
        'write failed',
      );
      expect(storage.delete).toHaveBeenCalledWith(
        storage.upload.mock.calls[0][0],
      );
    });

    it('returns a signed download URL', async () => {
      prisma.orders.findUnique.mockResolvedValue({ id: 1, user_id: 7 });
      prisma.order_files.create.mockResolvedValue({
        id: 5,
        file_path: 'orders/1/customer/file.pdf',
      });

      const result = await service.uploadCustomerFile(1, 7, pdfFile());

      expect(result.download_url).toBe('signed:orders/1/customer/file.pdf');
    });
  });

  describe('getOrderFiles', () => {
    it("refuses another customer's order", async () => {
      prisma.orders.findUnique.mockResolvedValue({ id: 1, user_id: 99 });

      await expect(service.getOrderFiles(1, 7)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('allows an admin to read any order', async () => {
      prisma.orders.findUnique.mockResolvedValue({ id: 1, user_id: 99 });
      prisma.order_files.findMany.mockResolvedValue([
        { id: 3, file_path: 'orders/1/customer/a.pdf' },
      ]);

      const result = await service.getOrderFiles(1, 7, true);

      expect(result[0].download_url).toBe('signed:orders/1/customer/a.pdf');
    });
  });

  describe('deleteCustomerFile', () => {
    it('rejects a file that belongs to a different order', async () => {
      prisma.orders.findUnique.mockResolvedValue({ id: 1, user_id: 7 });
      prisma.order_files.findUnique.mockResolvedValue({
        id: 3,
        order_id: 99,
        uploaded_by: 7,
      });

      await expect(
        service.deleteCustomerFile(1, 3, 7),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses to delete an admin deliverable', async () => {
      prisma.orders.findUnique.mockResolvedValue({ id: 1, user_id: 7 });
      prisma.order_files.findUnique.mockResolvedValue({
        id: 3,
        order_id: 1,
        uploaded_by: 42,
      });

      await expect(
        service.deleteCustomerFile(1, 3, 7),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(storage.delete).not.toHaveBeenCalled();
    });

    it('deletes a file the customer uploaded themselves', async () => {
      prisma.orders.findUnique.mockResolvedValue({ id: 1, user_id: 7 });
      prisma.order_files.findUnique.mockResolvedValue({
        id: 3,
        order_id: 1,
        uploaded_by: 7,
        file_path: 'orders/1/customer/a.pdf',
      });

      await service.deleteCustomerFile(1, 3, 7);

      expect(storage.delete).toHaveBeenCalledWith('orders/1/customer/a.pdf');
      expect(prisma.order_files.delete).toHaveBeenCalledWith({
        where: { id: 3 },
      });
    });
  });

  describe('uploadDeliverable', () => {
    it('notifies the customer in the same transaction as the file row', async () => {
      prisma.orders.findUnique.mockResolvedValue({
        id: 1,
        user_id: 7,
        order_number: 'SANAD-2026-X',
      });
      tx.order_files.create.mockResolvedValue({ id: 9, file_path: 'stored' });

      await service.uploadDeliverable(1, 42, pdfFile());

      expect(tx.order_files.create.mock.calls[0][0].data.file_category).toBe(
        'admin_deliverable',
      );
      expect(tx.notifications.create.mock.calls[0][0].data).toEqual(
        expect.objectContaining({
          user_id: 7,
          notification_type: 'deliverable_ready',
        }),
      );
    });

    it('skips the notification for a guest order', async () => {
      prisma.orders.findUnique.mockResolvedValue({
        id: 1,
        user_id: null,
        order_number: 'SANAD-2026-X',
      });
      tx.order_files.create.mockResolvedValue({ id: 9, file_path: 'stored' });

      await service.uploadDeliverable(1, 42, pdfFile());

      expect(tx.notifications.create).not.toHaveBeenCalled();
    });

    it('removes the uploaded object when the transaction fails', async () => {
      prisma.orders.findUnique.mockResolvedValue({
        id: 1,
        user_id: 7,
        order_number: 'SANAD-2026-X',
      });
      prisma.$transaction.mockRejectedValue(new Error('rollback'));

      await expect(service.uploadDeliverable(1, 42, pdfFile())).rejects.toThrow(
        'rollback',
      );
      expect(storage.delete).toHaveBeenCalledWith(
        storage.upload.mock.calls[0][0],
      );
    });
  });

  describe('getDeliverables', () => {
    it('returns only admin deliverables', async () => {
      prisma.orders.findUnique.mockResolvedValue({ id: 1, user_id: 7 });

      await service.getDeliverables(1, 7);

      expect(prisma.order_files.findMany.mock.calls[0][0].where).toEqual({
        order_id: 1,
        file_category: 'admin_deliverable',
      });
    });

    it("refuses another customer's deliverables", async () => {
      prisma.orders.findUnique.mockResolvedValue({ id: 1, user_id: 99 });

      await expect(service.getDeliverables(1, 7)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });
});
