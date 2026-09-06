import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { TestimonialsService } from './testimonials.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/utils';

const query = (overrides: Partial<PaginationDto> = {}) =>
  Object.assign(new PaginationDto(), overrides);

describe('TestimonialsService', () => {
  let service: TestimonialsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      testimonials: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };
    service = new TestimonialsService(prisma as PrismaService);
  });

  describe('findAllPublished', () => {
    it('returns published testimonials only', async () => {
      await service.findAllPublished();

      expect(prisma.testimonials.findMany.mock.calls[0][0].where).toEqual({
        is_published: true,
      });
    });

    it('filters published testimonials by service', async () => {
      await service.findAllPublished(4);

      expect(prisma.testimonials.findMany.mock.calls[0][0].where).toEqual({
        is_published: true,
        package_id: 4,
      });
    });
  });

  describe('findAllAdmin', () => {
    it('returns unpublished rows too and paginates them', async () => {
      prisma.testimonials.findMany.mockResolvedValue([
        { id: 1, is_published: false },
      ]);
      prisma.testimonials.count.mockResolvedValue(1);

      const result = await service.findAllAdmin(query({ page: 1, limit: 20 }));

      expect(prisma.testimonials.findMany.mock.calls[0][0].where).toEqual({});
      expect(result.data.items).toEqual([{ id: 1, is_published: false }]);
    });

    it('searches names and both testimonial languages', async () => {
      await service.findAllAdmin(query({ search: 'sara' }));

      expect(
        prisma.testimonials.findMany.mock.calls[0][0].where.OR,
      ).toHaveLength(4);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException for an unknown id', async () => {
      prisma.testimonials.findUnique.mockResolvedValue(null);

      await expect(service.findOne(9)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('defaults rating, publication state, and ordering', async () => {
      prisma.testimonials.create.mockResolvedValue({ id: 1 });

      await service.create({
        customer_name: 'Sara',
        testimonial_ar: 'ممتاز',
        testimonial_en: 'Excellent',
      } as never);

      expect(prisma.testimonials.create.mock.calls[0][0].data).toEqual(
        expect.objectContaining({
          rating: 5,
          is_published: true,
          display_order: 0,
        }),
      );
    });

    it('keeps an explicitly unpublished testimonial hidden', async () => {
      prisma.testimonials.create.mockResolvedValue({ id: 1 });

      await service.create({
        customer_name: 'Sara',
        testimonial_ar: 'ممتاز',
        testimonial_en: 'Excellent',
        is_published: false,
      } as never);

      expect(
        prisma.testimonials.create.mock.calls[0][0].data.is_published,
      ).toBe(false);
    });
  });

  describe('update', () => {
    it('checks existence before writing', async () => {
      prisma.testimonials.findUnique.mockResolvedValue(null);

      await expect(
        service.update(9, { rating: 4 } as never),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.testimonials.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('checks existence before deleting', async () => {
      prisma.testimonials.findUnique.mockResolvedValue(null);

      await expect(service.remove(9)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.testimonials.delete).not.toHaveBeenCalled();
    });

    it('deletes an existing testimonial', async () => {
      prisma.testimonials.findUnique.mockResolvedValue({ id: 9 });
      prisma.testimonials.delete.mockResolvedValue({ id: 9 });

      await service.remove(9);

      expect(prisma.testimonials.delete).toHaveBeenCalledWith({
        where: { id: 9 },
      });
    });
  });
});
