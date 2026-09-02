import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../files/storage.service';
import { UploadSiteMediaDto, UploadPackageImageDto } from './dto';
import { MulterFile } from '../common/interfaces';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import {
  IMAGE_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  validateFileSignature,
} from '../files/file-validation';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  private validateImage(file: MulterFile) {
    if (!file) throw new BadRequestException('File is required');
    if (
      !IMAGE_MIME_TYPES.includes(
        file.mimetype as (typeof IMAGE_MIME_TYPES)[number],
      )
    ) {
      throw new BadRequestException({
        message: 'Only JPEG, PNG, and WEBP images are allowed',
        code: 'INVALID_IMAGE_TYPE',
      });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException({
        message: 'Image exceeds the 15MB limit',
        code: 'FILE_TOO_LARGE',
      });
    }
    validateFileSignature(file);
  }

  // Public: get active media assets
  async getPublicMedia() {
    const media = await this.prisma.site_media.findMany({
      where: { is_active: true },
    });

    return Promise.all(
      media.map(async (m) => ({
        ...m,
        url: await this.storageService.getSignedUrl(m.media_path, 86400),
      })),
    );
  }

  // Admin: upload site media
  async uploadSiteMedia(
    file: MulterFile,
    dto: UploadSiteMediaDto,
    adminId: number,
  ) {
    this.validateImage(file);

    const safeKey = dto.media_key
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]/g, '_');
    const previous = await this.prisma.site_media.findUnique({
      where: { media_key: safeKey },
    });

    const ext = path.extname(file.originalname).toLowerCase();
    const storageKey = `media/site/${safeKey}_${uuidv4().substring(0, 8)}${ext}`;

    const uploadRes = await this.storageService.upload(
      storageKey,
      file.buffer,
      file.mimetype,
    );

    let media;
    try {
      media = await this.prisma.$transaction(async (tx) => {
        const saved = await tx.site_media.upsert({
          where: { media_key: safeKey },
          update: {
            media_path: uploadRes.key,
            media_type: file.mimetype,
            alt_text_ar: dto.alt_text_ar,
            alt_text_en: dto.alt_text_en,
            is_active: true,
          },
          create: {
            media_key: safeKey,
            media_path: uploadRes.key,
            media_type: file.mimetype,
            alt_text_ar: dto.alt_text_ar,
            alt_text_en: dto.alt_text_en,
            is_active: true,
          },
        });

        await tx.admin_activity_log.create({
          data: {
            admin_id: adminId,
            action: 'upload_site_media',
            table_name: 'site_media',
            record_id: saved.id,
            description: `Uploaded site media: ${safeKey}`,
          },
        });
        return saved;
      });
    } catch (error) {
      await this.deleteUploadedObject(uploadRes.key);
      throw error;
    }

    if (previous && previous.media_path !== media.media_path) {
      try {
        await this.storageService.delete(previous.media_path);
      } catch (error) {
        this.logger.warn(
          `Could not remove replaced media object ${previous.media_path}: ${String(error)}`,
        );
      }
    }

    const url = await this.storageService.getSignedUrl(media.media_path, 86400);
    return { ...media, url };
  }

  // Admin: delete site media
  async deleteSiteMedia(id: number, adminId: number) {
    const media = await this.prisma.site_media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException('Site media not found');

    await this.prisma.$transaction([
      this.prisma.site_media.delete({ where: { id } }),
      this.prisma.admin_activity_log.create({
        data: {
          admin_id: adminId,
          action: 'delete_site_media',
          table_name: 'site_media',
          record_id: id,
          description: `Deleted site media: ${media.media_key}`,
        },
      }),
    ]);
    await this.deleteUploadedObject(media.media_path);

    return { success: true, message: 'Media deleted' };
  }

  // Admin: upload image for package
  async uploadPackageImage(
    packageId: number,
    file: MulterFile,
    dto: UploadPackageImageDto,
    adminId: number,
  ) {
    const pkg = await this.prisma.packages.findUnique({
      where: { id: packageId },
    });
    if (!pkg) throw new NotFoundException('Package not found');

    this.validateImage(file);

    const ext = path.extname(file.originalname).toLowerCase();
    const storageKey = `packages/${packageId}/${uuidv4()}${ext}`;

    const uploadRes = await this.storageService.upload(
      storageKey,
      file.buffer,
      file.mimetype,
    );

    let image;
    try {
      image = await this.prisma.$transaction(async (tx) => {
        if (dto.is_primary) {
          await tx.package_images.updateMany({
            where: { package_id: packageId },
            data: { is_primary: false },
          });
        }

        const lastImage = await tx.package_images.findFirst({
          where: { package_id: packageId },
          orderBy: { display_order: 'desc' },
          select: { display_order: true },
        });
        const saved = await tx.package_images.create({
          data: {
            package_id: packageId,
            image_path: uploadRes.key,
            is_primary: dto.is_primary ?? !lastImage,
            display_order: (lastImage?.display_order ?? 0) + 1,
            alt_text: dto.alt_text || pkg.name_ar,
          },
        });

        await tx.admin_activity_log.create({
          data: {
            admin_id: adminId,
            action: 'upload_package_image',
            table_name: 'package_images',
            record_id: saved.id,
            description: `Uploaded image for package #${packageId}`,
          },
        });
        return saved;
      });
    } catch (error) {
      await this.deleteUploadedObject(uploadRes.key);
      throw error;
    }

    const url = await this.storageService.getSignedUrl(image.image_path, 86400);
    return { ...image, url };
  }

  // Admin: delete package image
  async deletePackageImage(
    packageId: number,
    imageId: number,
    adminId: number,
  ) {
    const image = await this.prisma.package_images.findUnique({
      where: { id: imageId },
    });
    if (!image || image.package_id !== packageId) {
      throw new NotFoundException('Image not found for this package');
    }

    await this.prisma.$transaction([
      this.prisma.package_images.delete({ where: { id: imageId } }),
      this.prisma.admin_activity_log.create({
        data: {
          admin_id: adminId,
          action: 'delete_package_image',
          table_name: 'package_images',
          record_id: imageId,
          description: `Deleted image #${imageId} for package #${packageId}`,
        },
      }),
    ]);
    await this.deleteUploadedObject(image.image_path);

    return { success: true, message: 'Package image deleted' };
  }

  private async deleteUploadedObject(key: string): Promise<void> {
    try {
      await this.storageService.delete(key);
    } catch (error) {
      this.logger.warn(
        `Could not remove storage object ${key}: ${String(error)}`,
      );
    }
  }
}
