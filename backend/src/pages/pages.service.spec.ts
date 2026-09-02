import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PagesService } from './pages.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/utils';

const query = (overrides: Partial<PaginationDto> = {}) =>
  Object.assign(new PaginationDto(), overrides);

describe('PagesService', () => {
  let service: PagesService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      pages: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
        update: vi.fn(),
      },
    };
    service = new PagesService(prisma as PrismaService);
  });

  describe('findBySlug', () => {
    it('normalizes the slug before looking it up', async () => {
      prisma.pages.findUnique.mockResolvedValue({
        id: 1,
        slug: 'terms',
        is_active: true,
      });

      await service.findBySlug('  TERMS  ');

      expect(prisma.pages.findUnique).toHaveBeenCalledWith({
        where: { slug: 'terms' },
      });
    });

    it('hides an inactive page behind a 404', async () => {
      prisma.pages.findUnique.mockResolvedValue({
        id: 1,
        slug: 'terms',
        is_active: false,
      });

      await expect(service.findBySlug('terms')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws NotFoundException for an unknown slug', async () => {
      prisma.pages.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findAllAdmin', () => {
    it('searches titles and slugs', async () => {
      await service.findAllAdmin(query({ search: 'privacy' }));

      expect(prisma.pages.findMany.mock.calls[0][0].where.OR).toEqual([
        { title_ar: { contains: 'privacy', mode: 'insensitive' } },
        { title_en: { contains: 'privacy', mode: 'insensitive' } },
        { slug: { contains: 'privacy', mode: 'insensitive' } },
      ]);
    });

    it('returns every page regardless of activity state', async () => {
      prisma.pages.findMany.mockResolvedValue([{ id: 1, is_active: false }]);
      prisma.pages.count.mockResolvedValue(1);

      const result = await service.findAllAdmin(query());

      expect(prisma.pages.findMany.mock.calls[0][0].where).toEqual({});
      expect(result.data.items).toHaveLength(1);
    });
  });

  describe('findOneAdmin', () => {
    it('throws NotFoundException for an unknown id', async () => {
      prisma.pages.findUnique.mockResolvedValue(null);

      await expect(service.findOneAdmin(9)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('rejects a slug that already exists', async () => {
      prisma.pages.findUnique.mockResolvedValue({ id: 1, slug: 'terms' });

      await expect(
        service.create({
          title_ar: 'الشروط',
          title_en: 'Terms',
          slug: 'Terms',
        } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.pages.create).not.toHaveBeenCalled();
    });

    it('stores a normalized slug and defaults to active', async () => {
      prisma.pages.findUnique.mockResolvedValue(null);
      prisma.pages.create.mockResolvedValue({ id: 2 });

      await service.create({
        title_ar: 'الشروط',
        title_en: 'Terms',
        slug: '  TERMS  ',
      } as never);

      expect(prisma.pages.create.mock.calls[0][0].data).toEqual(
        expect.objectContaining({ slug: 'terms', is_active: true }),
      );
    });
  });

  describe('update', () => {
    it('rejects an update to a missing page', async () => {
      prisma.pages.findUnique.mockResolvedValue(null);

      await expect(
        service.update(9, { title_en: 'X' } as never),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.pages.update).not.toHaveBeenCalled();
    });

    it('rejects a slug already used by a different page', async () => {
      prisma.pages.findUnique.mockResolvedValue({ id: 9, slug: 'terms' });
      prisma.pages.findFirst.mockResolvedValue({ id: 4, slug: 'privacy' });

      await expect(
        service.update(9, { slug: 'privacy' } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.pages.findFirst).toHaveBeenCalledWith({
        where: { slug: 'privacy', id: { not: 9 } },
      });
    });

    it('allows a page to keep its own slug', async () => {
      prisma.pages.findUnique.mockResolvedValue({ id: 9, slug: 'terms' });
      prisma.pages.findFirst.mockResolvedValue(null);
      prisma.pages.update.mockResolvedValue({ id: 9 });

      await service.update(9, { slug: 'TERMS' } as never);

      expect(prisma.pages.update.mock.calls[0][0].data.slug).toBe('terms');
    });
  });
});
