import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OffersService } from './offers.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/utils';

const query = (overrides: Partial<PaginationDto> = {}) =>
  Object.assign(new PaginationDto(), overrides);

const validOffer = {
  package_id: 1,
  name_ar: 'عرض',
  name_en: 'Offer',
  discount_percentage: 20,
  start_date: '2026-01-01T00:00:00.000Z',
  end_date: '2026-02-01T00:00:00.000Z',
};

describe('OffersService', () => {
  let service: OffersService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      offers: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      packages: { findUnique: vi.fn() },
      orders: { count: vi.fn().mockResolvedValue(0) },
    };
    service = new OffersService(prisma as PrismaService);
  });

  describe('findAllPublic', () => {
    it('returns only offers inside their active window', async () => {
      await service.findAllPublic();

      const { where } = prisma.offers.findMany.mock.calls[0][0];
      expect(where.is_active).toBe(true);
      expect(where.start_date.lte).toBeInstanceOf(Date);
      expect(where.end_date.gte).toBeInstanceOf(Date);
    });
  });

  describe('findAllAdmin', () => {
    it('paginates and searches both language columns', async () => {
      prisma.offers.findMany.mockResolvedValue([{ id: 1 }]);
      prisma.offers.count.mockResolvedValue(1);

      const result = await service.findAllAdmin(query({ search: 'eid' }));

      expect(prisma.offers.findMany.mock.calls[0][0].where.OR).toEqual([
        { name_ar: { contains: 'eid', mode: 'insensitive' } },
        { name_en: { contains: 'eid', mode: 'insensitive' } },
      ]);
      expect(result.data.meta.total).toBe(1);
    });
  });

  describe('create', () => {
    it('rejects a window that ends before it starts', async () => {
      await expect(
        service.create({
          ...validOffer,
          start_date: '2026-02-01T00:00:00.000Z',
          end_date: '2026-01-01T00:00:00.000Z',
        } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.offers.create).not.toHaveBeenCalled();
    });

    it('rejects a zero-length window', async () => {
      await expect(
        service.create({
          ...validOffer,
          end_date: validOffer.start_date,
        } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an offer attached to a package that does not exist', async () => {
      prisma.packages.findUnique.mockResolvedValue(null);

      await expect(service.create(validOffer as never)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.offers.create).not.toHaveBeenCalled();
    });

    it('stores the window as Date instances', async () => {
      prisma.packages.findUnique.mockResolvedValue({ id: 1 });
      prisma.offers.create.mockResolvedValue({ id: 5 });

      await service.create(validOffer as never);

      const { data } = prisma.offers.create.mock.calls[0][0];
      expect(data.start_date).toBeInstanceOf(Date);
      expect(data.end_date).toBeInstanceOf(Date);
      expect(data.is_active).toBe(true);
    });

    it('rejects using the purchased service as the discounted service', async () => {
      await expect(
        service.create({
          ...validOffer,
          offer_type: 'cross_service_specific',
          package_id: 1,
          trigger_package_id: 1,
        } as never),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.offers.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('validates a partial window against the stored dates', async () => {
      prisma.offers.findUnique.mockResolvedValue({
        id: 5,
        start_date: new Date('2026-03-01'),
        end_date: new Date('2026-04-01'),
        package: { id: 1 },
      });

      await expect(
        service.update(5, { end_date: '2026-02-01T00:00:00.000Z' } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.offers.update).not.toHaveBeenCalled();
    });

    it('rejects a move to a package that does not exist', async () => {
      prisma.offers.findUnique.mockResolvedValue({
        id: 5,
        start_date: new Date('2026-03-01'),
        end_date: new Date('2026-04-01'),
        package: { id: 1 },
      });
      prisma.packages.findUnique.mockResolvedValue(null);

      await expect(
        service.update(5, { package_id: 99 } as never),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('writes only the supplied fields', async () => {
      prisma.offers.findUnique.mockResolvedValue({
        id: 5,
        start_date: new Date('2026-03-01'),
        end_date: new Date('2026-04-01'),
        package: { id: 1 },
      });
      prisma.offers.update.mockResolvedValue({ id: 5 });

      await service.update(5, { discount_percentage: 35 } as never);

      expect(prisma.offers.update.mock.calls[0][0].data).toEqual({
        discount_percentage: 35,
      });
    });

    it('clears an old target when changing to an any-service offer', async () => {
      prisma.offers.findUnique.mockResolvedValue({
        id: 5,
        offer_type: 'cross_service_specific',
        package_id: 2,
        trigger_package_id: 1,
        start_date: new Date('2026-03-01'),
        end_date: new Date('2026-04-01'),
        package: { id: 2 },
      });
      prisma.packages.findUnique.mockResolvedValue({ id: 1 });
      prisma.offers.update.mockResolvedValue({ id: 5 });

      await service.update(5, { offer_type: 'cross_service_any' } as never);

      expect(prisma.offers.update.mock.calls[0][0].data).toEqual({
        package_id: null,
        trigger_package_id: 1,
        offer_type: 'cross_service_any',
      });
    });
  });

  describe('remove', () => {
    it('soft-deletes an offer that orders already reference', async () => {
      prisma.offers.findUnique.mockResolvedValue({ id: 5, package: {} });
      prisma.orders.count.mockResolvedValue(2);
      prisma.offers.update.mockResolvedValue({ id: 5, is_active: false });

      await service.remove(5);

      expect(prisma.offers.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { is_active: false },
      });
      expect(prisma.offers.delete).not.toHaveBeenCalled();
    });

    it('hard-deletes an unused offer', async () => {
      prisma.offers.findUnique.mockResolvedValue({ id: 5, package: {} });
      prisma.orders.count.mockResolvedValue(0);
      prisma.offers.delete.mockResolvedValue({ id: 5 });

      await service.remove(5);

      expect(prisma.offers.delete).toHaveBeenCalledWith({ where: { id: 5 } });
    });
  });

  describe('getActiveOfferForPackage', () => {
    it('bounds the lookup by the current time', async () => {
      await service.getActiveOfferForPackage(1);

      const { where } = prisma.offers.findFirst.mock.calls[0][0];
      expect(where.package_id).toBe(1);
      expect(where.is_active).toBe(true);
      expect(where.start_date.lte).toBeInstanceOf(Date);
    });
  });
});
