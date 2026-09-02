import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';
import { MulterFile } from '../common/interfaces';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import {
  DOCUMENT_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  validateFileSignature,
} from './file-validation';

@Injectable()
export class FilesService {
  private readonly maxFileSize: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    configService: ConfigService,
  ) {
    this.maxFileSize = Math.min(
      configService.get<number>('MAX_FILE_SIZE') || MAX_UPLOAD_BYTES,
      MAX_UPLOAD_BYTES,
    );
  }

  private validateFile(file: MulterFile) {
    if (!file) {
      throw new BadRequestException({
        message: 'No file provided',
        code: 'FILE_REQUIRED',
      });
    }

    if (
      !DOCUMENT_MIME_TYPES.includes(
        file.mimetype as (typeof DOCUMENT_MIME_TYPES)[number],
      )
    ) {
      throw new BadRequestException({
        message:
          'Unsupported file format. Only PDF, DOC, DOCX, PNG, JPG, and WEBP files are allowed.',
        code: 'INVALID_FILE_TYPE',
      });
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException({
        message: `File size exceeds maximum limit of ${Math.floor(this.maxFileSize / 1048576)}MB.`,
        code: 'FILE_TOO_LARGE',
      });
    }
    validateFileSignature(file);
  }

  // Customer uploads file to their order
  async uploadCustomerFile(
    orderId: number,
    userId: number,
    file: MulterFile,
    category: string = 'customer_upload',
    description?: string,
  ) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (order.user_id !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }

    this.validateFile(file);

    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const storageKey = `orders/${orderId}/customer/${uuidv4()}-${safeName}${ext}`;

    const uploadRes = await this.storageService.upload(
      storageKey,
      file.buffer,
      file.mimetype,
    );

    let savedFile;
    try {
      savedFile = await this.prisma.order_files.create({
        data: {
          order_id: orderId,
          file_name: file.originalname,
          file_path: uploadRes.key,
          file_type: file.mimetype,
          file_size: file.size,
          uploaded_by: userId,
          file_category: category || 'customer_upload',
          description,
        },
      });
    } catch (error) {
      await this.storageService.delete(uploadRes.key).catch(() => undefined);
      throw error;
    }

    const signedUrl = await this.storageService.getSignedUrl(
      savedFile.file_path,
      3600,
    );

    return {
      ...savedFile,
      download_url: signedUrl,
    };
  }

  // Get all files for an order
  async getOrderFiles(
    orderId: number,
    userId: number,
    isAdmin: boolean = false,
  ) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (!isAdmin && order.user_id !== userId) {
      throw new ForbiddenException('Access denied to this order files');
    }

    const files = await this.prisma.order_files.findMany({
      where: { order_id: orderId },
      include: {
        users: { select: { id: true, name: true, role: true } },
      },
      orderBy: { uploaded_at: 'desc' },
    });

    const filesWithUrls = await Promise.all(
      files.map(async (f) => ({
        ...f,
        download_url: await this.storageService.getSignedUrl(f.file_path, 3600),
      })),
    );

    return filesWithUrls;
  }

  // Delete customer file
  async deleteCustomerFile(orderId: number, fileId: number, userId: number) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (order.user_id !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const file = await this.prisma.order_files.findUnique({
      where: { id: fileId },
      include: { users: true },
    });
    if (!file || file.order_id !== orderId) {
      throw new NotFoundException('File not found in this order');
    }

    if (file.uploaded_by !== userId) {
      throw new ForbiddenException('Cannot delete files uploaded by admin');
    }

    await this.storageService.delete(file.file_path);
    await this.prisma.order_files.delete({ where: { id: fileId } });

    return { success: true, message: 'File deleted successfully' };
  }

  // Admin uploads deliverables (final CV, Cover letter, etc.)
  async uploadDeliverable(
    orderId: number,
    adminId: number,
    file: MulterFile,
    deliverableType: string = 'final_deliverable',
    notes?: string,
  ) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    this.validateFile(file);

    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const storageKey = `orders/${orderId}/deliverables/${uuidv4()}-${safeName}${ext}`;

    const uploadRes = await this.storageService.upload(
      storageKey,
      file.buffer,
      file.mimetype,
    );

    let savedFile;
    try {
      savedFile = await this.prisma.$transaction(async (tx) => {
        const created = await tx.order_files.create({
          data: {
            order_id: orderId,
            file_name: file.originalname,
            file_path: uploadRes.key,
            file_type: file.mimetype,
            file_size: file.size,
            uploaded_by: adminId,
            file_category: 'admin_deliverable',
            description: notes,
            metadata: {
              deliverable_type: deliverableType,
              notes: notes || null,
            },
          },
        });

        if (order.user_id) {
          await tx.notifications.create({
            data: {
              user_id: order.user_id,
              order_id: orderId,
              title_ar: 'تم رفع الملفات النهائية لطلبك',
              title_en: 'Final Deliverables Uploaded',
              message_ar: `تم رفع ملف جديد (${file.originalname}) لطلبك رقم ${order.order_number}. يمكنك تحميله الآن.`,
              message_en: `A new deliverable file (${file.originalname}) has been uploaded for order #${order.order_number}.`,
              notification_type: 'deliverable_ready',
            },
          });
        }
        return created;
      });
    } catch (error) {
      await this.storageService.delete(uploadRes.key).catch(() => undefined);
      throw error;
    }

    const downloadUrl = await this.storageService.getSignedUrl(
      savedFile.file_path,
      3600,
    );

    return {
      ...savedFile,
      deliverable_type: deliverableType,
      notes,
      download_url: downloadUrl,
    };
  }

  // Customer or Admin gets deliverables
  async getDeliverables(
    orderId: number,
    userId: number,
    isAdmin: boolean = false,
  ) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (!isAdmin && order.user_id !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const deliverables = await this.prisma.order_files.findMany({
      where: {
        order_id: orderId,
        file_category: 'admin_deliverable',
      },
      orderBy: { uploaded_at: 'desc' },
    });

    return Promise.all(
      deliverables.map(async (d) => ({
        ...d,
        download_url: await this.storageService.getSignedUrl(d.file_path, 3600),
      })),
    );
  }
}
