import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { PackagesService } from './packages.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/utils';

const query = (overrides: Partial<PaginationDto> = {}) =>
  Object.assign(new PaginationDto(), overrides);

describe('PackagesService', () => {
  let service: PackagesService;
  let prisma: any;
  let storage: any;

  beforeEach(() => {
    prisma = {
      packages: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };
    storage = {
      getSignedUrl: vi.fn(async (key: string) => `signed:${key}`),
    };
    service = new PackagesService(prisma as PrismaService, storage);
  });

  describe('findAllPublic', () => {
    it('returns only active packages and paginates the result', async () => {
      prisma.packages.findMany.mockResolvedValue([{ id: 1 }]);
      prisma.packages.count.mockResolvedValue(1);

      const result = await service.findAllPublic(query({ page: 1, limit: 20 }));

      expect(prisma.packages.findMany.mock.calls[0][0].where).toEqual({
        is_active: true,
      });
      expect(result.data.items).toEqual([
        {
          id: 1,
          buyer_count: 0,
          rating_average: null,
          rating_count: 0,
        },
      ]);
      expect(result.data.meta).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('keeps the active filter when a search term is applied', async () => {
      await service.findAllPublic(query({ search: 'cv' }));

      const { where } = prisma.packages.findMany.mock.calls[0][0];
      expect(where.is_active).toBe(true);
      expect(where.OR).toEqual([
        { name_ar: { contains: 'cv', mode: 'insensitive' } },
        { name_en: { contains: 'cv', mode: 'insensitive' } },
      ]);
    });

    it('exposes only offers inside their active window', async () => {
      await service.findAllPublic(query());

      const offerWhere =
        prisma.packages.findMany.mock.calls[0][0].include.offers.where;
      expect(offerWhere.is_active).toBe(true);
      expect(offerWhere.start_date.lte).toBeInstanceOf(Date);
      expect(offerWhere.end_date.gte).toBeInstanceOf(Date);
    });

    it('returns real purchase and published rating summaries', async () => {
      prisma.packages.findMany.mockResolvedValue([
        {
          id: 1,
          _count: { orders: 3 },
          package_reviews: [{ rating: 5 }, { rating: 4 }],
        },
      ]);
      prisma.packages.count.mockResolvedValue(1);

      const result = await service.findAllPublic(query());
      const include = prisma.packages.findMany.mock.calls[0][0].include;

      expect(include._count.select.orders.where.status.in).toEqual([
        'paid',
        'awaiting_information',
        'received',
        'in_progress',
        'under_review',
        'ready',
        'completed',
      ]);
      expect(include.package_reviews).toEqual({
        where: { status: 'published' },
        select: { rating: true },
      });
      expect(result.data.items[0]).toEqual({
        id: 1,
        buyer_count: 3,
        rating_average: 4.5,
        rating_count: 2,
      });
    });

    it('adds a usable URL for package images stored by the admin', async () => {
      prisma.packages.findMany.mockResolvedValue([
        {
          id: 1,
          package_images: [{ id: 3, image_path: 'packages/1/image.png' }],
        },
      ]);
      prisma.packages.count.mockResolvedValue(1);

      const result = await service.findAllPublic(query());

      expect(result.data.items[0].package_images[0]).toEqual(
        expect.objectContaining({
          image_url: 'signed:packages/1/image.png',
        }),
      );
    });
  });

  describe('findOnePublic', () => {
    it('hides an inactive package behind a 404', async () => {
      prisma.packages.findFirst.mockResolvedValue(null);

      await expect(service.findOnePublic(9)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.packages.findFirst.mock.calls[0][0].where).toEqual({
        id: 9,
        is_active: true,
      });
    });
  });

  describe('findAllAdmin', () => {
    it('sorts by an allowlisted column in the requested direction', async () => {
      await service.findAllAdmin(query({ sortBy: 'price', sortOrder: 'asc' }));

      expect(prisma.packages.findMany.mock.calls[0][0].orderBy).toEqual({
        price: 'asc',
      });
    });

    it('falls back to sort_order when the requested column is not allowlisted', async () => {
      await service.findAllAdmin(
        query({ sortBy: 'password_hash', sortOrder: 'asc' }),
      );

      expect(prisma.packages.findMany.mock.calls[0][0].orderBy).toEqual({
        sort_order: 'asc',
      });
    });
  });

  describe('create', () => {
    it('applies catalog defaults for omitted fields', async () => {
      prisma.packages.create.mockResolvedValue({ id: 3 });

      await service.create({
        name_ar: 'باقة',
        name_en: 'Package',
        price: 499,
      } as never);

      expect(prisma.packages.create.mock.calls[0][0].data).toEqual(
        expect.objectContaining({
          features_ar: [],
          features_en: [],
          is_active: true,
          sort_order: 0,
          delivery_days: 7,
          max_revisions: 1,
        }),
      );
    });
  });

  describe('update', () => {
    it('rejects an update to a missing package before writing', async () => {
      prisma.packages.findUnique.mockResolvedValue(null);

      await expect(
        service.update(9, { price: 100 } as never),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.packages.update).not.toHaveBeenCalled();
    });

    it('sends only the supplied fields to the database', async () => {
      prisma.packages.findUnique.mockResolvedValue({ id: 9 });
      prisma.packages.update.mockResolvedValue({ id: 9 });

      await service.update(9, { price: 100 } as never);

      expect(prisma.packages.update.mock.calls[0][0].data).toEqual({
        price: 100,
      });
    });
  });

  describe('remove', () => {
    it('soft-deletes a package that already has orders', async () => {
      prisma.packages.findUnique.mockResolvedValue({
        id: 9,
        _count: { orders: 4 },
      });
      prisma.packages.update.mockResolvedValue({ id: 9, is_active: false });

      await service.remove(9);

      expect(prisma.packages.update).toHaveBeenCalledWith({
        where: { id: 9 },
        data: { is_active: false },
      });
      expect(prisma.packages.delete).not.toHaveBeenCalled();
    });

    it('hard-deletes a package that was never ordered', async () => {
      prisma.packages.findUnique.mockResolvedValue({
        id: 9,
        _count: { orders: 0 },
      });
      prisma.packages.delete.mockResolvedValue({ id: 9 });

      await service.remove(9);

      expect(prisma.packages.delete).toHaveBeenCalledWith({ where: { id: 9 } });
      expect(prisma.packages.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown package', async () => {
      prisma.packages.findUnique.mockResolvedValue(null);

      await expect(service.remove(9)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('verifies the package exists before toggling it', async () => {
      prisma.packages.findUnique.mockResolvedValue(null);

      await expect(service.updateStatus(9, false)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.packages.update).not.toHaveBeenCalled();
    });
  });
});
