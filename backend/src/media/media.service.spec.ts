import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MediaService } from './media.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../files/storage.service';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const pngFile = (overrides: Record<string, unknown> = {}) =>
  ({
    originalname: 'logo.PNG',
    mimetype: 'image/png',
    size: 2048,
    buffer: Buffer.from([...PNG_SIGNATURE, 0x00, 0x01]),
    ...overrides,
  }) as never;

describe('MediaService', () => {
  let service: MediaService;
  let prisma: any;
  let storage: any;
  let tx: any;

  beforeEach(() => {
    tx = {
      site_media: { upsert: vi.fn() },
      package_images: {
        updateMany: vi.fn(),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
      },
      admin_activity_log: { create: vi.fn() },
    };
    prisma = {
      site_media: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        delete: vi.fn(),
      },
      package_images: { findUnique: vi.fn(), delete: vi.fn() },
      packages: { findUnique: vi.fn() },
      admin_activity_log: { create: vi.fn() },
      $transaction: vi.fn(async (input: any) =>
        typeof input === 'function' ? input(tx) : Promise.all(input),
      ),
    };
    storage = {
      upload: vi.fn(async (key: string) => ({ key, url: `/${key}`, size: 10 })),
      getSignedUrl: vi.fn(async (key: string) => `signed:${key}`),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    service = new MediaService(
      prisma as PrismaService,
      storage as unknown as StorageService,
    );
  });

  describe('image validation', () => {
    it('rejects a document masquerading as site media', async () => {
      await expect(
        service.uploadSiteMedia(
          pngFile({ mimetype: 'application/pdf' }),
          { media_key: 'logo' } as never,
          1,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(storage.upload).not.toHaveBeenCalled();
    });

    it('rejects an image above the 15MB ceiling', async () => {
      await expect(
        service.uploadSiteMedia(
          pngFile({ size: 16 * 1024 * 1024 }),
          { media_key: 'logo' } as never,
          1,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(storage.upload).not.toHaveBeenCalled();
    });

    it('rejects content whose magic bytes contradict its declared type', async () => {
      await expect(
        service.uploadSiteMedia(
          pngFile({ buffer: Buffer.from('not-a-png-at-all') }),
          { media_key: 'logo' } as never,
          1,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(storage.upload).not.toHaveBeenCalled();
    });
  });

  describe('getPublicMedia', () => {
    it('returns active assets with signed URLs', async () => {
      prisma.site_media.findMany.mockResolvedValue([
        { id: 1, media_key: 'logo', media_path: 'media/site/logo.png' },
      ]);

      const result = await service.getPublicMedia();

      expect(prisma.site_media.findMany.mock.calls[0][0].where).toEqual({
        is_active: true,
      });
      expect(result[0].url).toBe('signed:media/site/logo.png');
    });
  });

  describe('uploadSiteMedia', () => {
    it('sanitizes the media key into the storage path', async () => {
      tx.site_media.upsert.mockResolvedValue({
        id: 1,
        media_key: 'hero_banner',
        media_path: 'stored/key.png',
      });

      await service.uploadSiteMedia(
        pngFile(),
        { media_key: '  Hero Banner  ' } as never,
        1,
      );

      expect(storage.upload.mock.calls[0][0]).toMatch(
        /^media\/site\/hero_banner_[a-f0-9]{8}\.png$/,
      );
      expect(tx.site_media.upsert.mock.calls[0][0].where).toEqual({
        media_key: 'hero_banner',
      });
    });

    // The media key is attacker-influenced and lands inside a storage path, so
    // separators and dots must not survive sanitization.
    it('cannot escape the media prefix through a traversal key', async () => {
      tx.site_media.upsert.mockResolvedValue({ id: 1, media_path: 'k.png' });

      await service.uploadSiteMedia(
        pngFile(),
        { media_key: '../../etc/passwd' } as never,
        1,
      );

      const key = storage.upload.mock.calls[0][0] as string;
      expect(key.startsWith('media/site/')).toBe(true);
      expect(key).not.toContain('..');
      expect(key.slice('media/site/'.length)).not.toContain('/');
    });

    it('removes the uploaded object when the database write fails', async () => {
      prisma.$transaction.mockRejectedValue(new Error('constraint violation'));

      await expect(
        service.uploadSiteMedia(pngFile(), { media_key: 'logo' } as never, 1),
      ).rejects.toThrow('constraint violation');

      expect(storage.delete).toHaveBeenCalledWith(
        storage.upload.mock.calls[0][0],
      );
    });

    it('deletes the replaced object once the new row is committed', async () => {
      prisma.site_media.findUnique.mockResolvedValue({
        id: 1,
        media_key: 'logo',
        media_path: 'media/site/logo_old.png',
      });
      tx.site_media.upsert.mockResolvedValue({
        id: 1,
        media_key: 'logo',
        media_path: 'media/site/logo_new.png',
      });

      await service.uploadSiteMedia(
        pngFile(),
        { media_key: 'logo' } as never,
        1,
      );

      expect(storage.delete).toHaveBeenCalledWith('media/site/logo_old.png');
    });

    it('keeps the object when the stored path did not change', async () => {
      prisma.site_media.findUnique.mockResolvedValue({
        id: 1,
        media_path: 'media/site/logo.png',
      });
      tx.site_media.upsert.mockResolvedValue({
        id: 1,
        media_path: 'media/site/logo.png',
      });

      await service.uploadSiteMedia(
        pngFile(),
        { media_key: 'logo' } as never,
        1,
      );

      expect(storage.delete).not.toHaveBeenCalled();
    });

    it('records the action in the admin activity log', async () => {
      tx.site_media.upsert.mockResolvedValue({ id: 1, media_path: 'k.png' });

      await service.uploadSiteMedia(
        pngFile(),
        { media_key: 'logo' } as never,
        42,
      );

      expect(tx.admin_activity_log.create.mock.calls[0][0].data).toEqual(
        expect.objectContaining({ admin_id: 42, action: 'upload_site_media' }),
      );
    });
  });

  describe('deleteSiteMedia', () => {
    it('throws NotFoundException for an unknown asset', async () => {
      prisma.site_media.findUnique.mockResolvedValue(null);

      await expect(service.deleteSiteMedia(9, 1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('removes the row and then the stored object', async () => {
      prisma.site_media.findUnique.mockResolvedValue({
        id: 9,
        media_key: 'logo',
        media_path: 'media/site/logo.png',
      });

      await service.deleteSiteMedia(9, 1);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(storage.delete).toHaveBeenCalledWith('media/site/logo.png');
    });
  });

  describe('uploadPackageImage', () => {
    it('rejects an upload for a package that does not exist', async () => {
      prisma.packages.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadPackageImage(9, pngFile(), {} as never, 1),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(storage.upload).not.toHaveBeenCalled();
    });

    it('makes the first image primary and starts ordering at one', async () => {
      prisma.packages.findUnique.mockResolvedValue({ id: 3, name_ar: 'باقة' });
      tx.package_images.findFirst.mockResolvedValue(null);
      tx.package_images.create.mockResolvedValue({
        id: 8,
        image_path: 'k.png',
      });

      await service.uploadPackageImage(3, pngFile(), {} as never, 1);

      expect(tx.package_images.create.mock.calls[0][0].data).toEqual(
        expect.objectContaining({
          is_primary: true,
          display_order: 1,
          alt_text: 'باقة',
        }),
      );
      expect(tx.package_images.updateMany).not.toHaveBeenCalled();
    });

    it('demotes existing primaries when a new primary is uploaded', async () => {
      prisma.packages.findUnique.mockResolvedValue({ id: 3, name_ar: 'باقة' });
      tx.package_images.findFirst.mockResolvedValue({ display_order: 4 });
      tx.package_images.create.mockResolvedValue({
        id: 9,
        image_path: 'k.png',
      });

      await service.uploadPackageImage(
        3,
        pngFile(),
        { is_primary: true } as never,
        1,
      );

      expect(tx.package_images.updateMany).toHaveBeenCalledWith({
        where: { package_id: 3 },
        data: { is_primary: false },
      });
      expect(tx.package_images.create.mock.calls[0][0].data.display_order).toBe(
        5,
      );
    });

    it('does not make a later image primary by default', async () => {
      prisma.packages.findUnique.mockResolvedValue({ id: 3, name_ar: 'باقة' });
      tx.package_images.findFirst.mockResolvedValue({ display_order: 2 });
      tx.package_images.create.mockResolvedValue({
        id: 9,
        image_path: 'k.png',
      });

      await service.uploadPackageImage(3, pngFile(), {} as never, 1);

      expect(tx.package_images.create.mock.calls[0][0].data.is_primary).toBe(
        false,
      );
    });

    it('removes the uploaded object when the database write fails', async () => {
      prisma.packages.findUnique.mockResolvedValue({ id: 3, name_ar: 'باقة' });
      prisma.$transaction.mockRejectedValue(new Error('write failed'));

      await expect(
        service.uploadPackageImage(3, pngFile(), {} as never, 1),
      ).rejects.toThrow('write failed');
      expect(storage.delete).toHaveBeenCalledWith(
        storage.upload.mock.calls[0][0],
      );
    });
  });

  describe('deletePackageImage', () => {
    it('refuses an image that belongs to a different package', async () => {
      prisma.package_images.findUnique.mockResolvedValue({
        id: 8,
        package_id: 99,
        image_path: 'k.png',
      });

      await expect(service.deletePackageImage(3, 8, 1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(storage.delete).not.toHaveBeenCalled();
    });

    it('deletes the row and the stored object', async () => {
      prisma.package_images.findUnique.mockResolvedValue({
        id: 8,
        package_id: 3,
        image_path: 'packages/3/img.png',
      });

      await service.deletePackageImage(3, 8, 1);

      expect(storage.delete).toHaveBeenCalledWith('packages/3/img.png');
    });
  });
});
