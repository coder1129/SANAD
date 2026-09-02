import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationQueryDto } from './dto';
import { createPaginatedResponse } from '../common/utils';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: number, query: NotificationQueryDto) {
    const where: Record<string, any> = { user_id: userId };
    if (query.unread_only) {
      where.is_read = false;
    }

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notifications.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.notifications.count({ where }),
      this.prisma.notifications.count({
        where: { user_id: userId, is_read: false },
      }),
    ]);

    const paginated = createPaginatedResponse(
      items,
      total,
      query.page,
      query.limit,
    );
    return {
      ...paginated,
      unread_count: unreadCount,
    };
  }

  async markAsRead(id: number, userId: number) {
    const notification = await this.prisma.notifications.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.user_id !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.notifications.update({
      where: { id },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });
  }

  async markAllAsRead(userId: number) {
    const updated = await this.prisma.notifications.updateMany({
      where: { user_id: userId, is_read: false },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });

    return { success: true, count: updated.count };
  }

  // Programmatic creation helper
  async createNotification(data: {
    userId: number;
    orderId?: number;
    titleAr: string;
    titleEn: string;
    messageAr: string;
    messageEn: string;
    type: string;
  }) {
    return this.prisma.notifications.create({
      data: {
        user_id: data.userId,
        order_id: data.orderId,
        title_ar: data.titleAr,
        title_en: data.titleEn,
        message_ar: data.messageAr,
        message_en: data.messageEn,
        notification_type: data.type,
      },
    });
  }
}
