import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReviewStatus } from '../common/enums';
import { createPaginatedResponse } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdminReviewFilterDto,
  CreateReviewDto,
  PublicReviewFilterDto,
  UpdateReviewDto,
} from './dto';

const PAID_PAYMENT_STATUSES = ['paid', 'success'];

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  private customerDisplayName(user: {
    name: string;
    first_name: string | null;
    last_name: string | null;
  }): string {
    const firstName =
      user.first_name?.trim() || user.name.trim().split(/\s+/)[0];
    const lastName = user.last_name?.trim() || user.name.trim().split(/\s+/)[1];
    return lastName
      ? `${firstName} ${lastName.charAt(0).toUpperCase()}.`
      : firstName;
  }

  async listPublished(query: PublicReviewFilterDto) {
    const where: Prisma.package_reviewsWhereInput = {
      status: ReviewStatus.PUBLISHED,
      ...(query.package_id ? { package_id: query.package_id } : {}),
    };
    const [rows, total, aggregate, grouped] = await Promise.all([
      this.prisma.package_reviews.findMany({
        where,
        include: {
          user: { select: { name: true, first_name: true, last_name: true } },
          package: { select: { id: true, name_en: true, name_ar: true } },
          order: { select: { id: true, order_number: true, status: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.package_reviews.count({ where }),
      this.prisma.package_reviews.aggregate({ where, _avg: { rating: true } }),
      this.prisma.package_reviews.groupBy({
        by: ['rating'],
        where,
        _count: { rating: true },
      }),
    ]);
    const page = createPaginatedResponse(
      rows.map(({ user, ...review }) => ({
        ...review,
        customer_display_name: this.customerDisplayName(user),
        verified_customer: true,
      })),
      total,
      query.page,
      query.limit,
    );
    return {
      ...page,
      data: {
        ...page.data,
        summary: {
          average_rating: aggregate._avg.rating ?? 0,
          total_reviews: total,
          distribution: Object.fromEntries(
            [1, 2, 3, 4, 5].map((rating) => [
              rating,
              grouped.find((item) => item.rating === rating)?._count.rating ??
                0,
            ]),
          ),
        },
      },
    };
  }

  async findForOrder(orderId: number, userId: number) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      select: { id: true, user_id: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.user_id !== userId) {
      throw new ForbiddenException({
        message: 'Access denied to this order',
        code: 'ORDER_FORBIDDEN',
      });
    }
    return this.prisma.package_reviews.findUnique({
      where: { order_id: orderId },
    });
  }

  async create(userId: number, dto: CreateReviewDto) {
    const order = await this.prisma.orders.findUnique({
      where: { id: dto.order_id },
      include: { payments: { select: { status: true, amount: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.user_id !== userId) {
      throw new ForbiddenException({
        message: 'You cannot review another customer order',
        code: 'ORDER_FORBIDDEN',
      });
    }
    if (order.status !== 'completed') {
      throw new BadRequestException({
        message: 'Only completed orders can be reviewed',
        code: 'ORDER_NOT_REVIEWABLE',
      });
    }
    if (!order.package_id) {
      throw new BadRequestException({
        message: 'This order is not linked to a service',
        code: 'ORDER_PACKAGE_MISSING',
      });
    }
    if (
      !order.payments.some(
        (payment) =>
          PAID_PAYMENT_STATUSES.includes(payment.status) &&
          Number(payment.amount) > 0,
      )
    ) {
      throw new BadRequestException({
        message: 'Only paid orders can be reviewed',
        code: 'ORDER_NOT_PAID',
      });
    }
    const existing = await this.prisma.package_reviews.findUnique({
      where: { order_id: order.id },
    });
    if (existing) {
      throw new ConflictException({
        message: 'This order has already been reviewed',
        code: 'REVIEW_ALREADY_EXISTS',
      });
    }

    try {
      return await this.prisma.package_reviews.create({
        data: {
          user_id: userId,
          package_id: order.package_id,
          order_id: order.id,
          rating: dto.rating,
          comment: dto.comment.trim(),
          status: ReviewStatus.PENDING,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          message: 'This order has already been reviewed',
          code: 'REVIEW_ALREADY_EXISTS',
        });
      }
      throw error;
    }
  }

  async update(id: number, userId: number, dto: UpdateReviewDto) {
    const review = await this.prisma.package_reviews.findUnique({
      where: { id },
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.user_id !== userId) {
      throw new ForbiddenException({
        message: 'You cannot edit another customer review',
        code: 'REVIEW_FORBIDDEN',
      });
    }
    if (dto.rating === undefined && dto.comment === undefined) return review;
    return this.prisma.package_reviews.update({
      where: { id },
      data: {
        ...(dto.rating === undefined ? {} : { rating: dto.rating }),
        ...(dto.comment === undefined ? {} : { comment: dto.comment.trim() }),
        status: ReviewStatus.PENDING,
        updated_at: new Date(),
      },
    });
  }

  async listAdmin(query: AdminReviewFilterDto) {
    const where: Prisma.package_reviewsWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.package_id ? { package_id: query.package_id } : {}),
      ...(query.search
        ? {
            OR: [
              { comment: { contains: query.search, mode: 'insensitive' } },
              {
                user: { name: { contains: query.search, mode: 'insensitive' } },
              },
              {
                order: {
                  order_number: { contains: query.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.package_reviews.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          package: { select: { id: true, name_en: true, name_ar: true } },
          order: { select: { id: true, order_number: true, status: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.package_reviews.count({ where }),
    ]);
    return createPaginatedResponse(items, total, query.page, query.limit);
  }

  async findOneAdmin(id: number) {
    const review = await this.prisma.package_reviews.findUnique({
      where: { id },
      include: { user: true, package: true, order: true },
    });
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }

  async moderate(id: number, adminId: number, status: ReviewStatus) {
    const review = await this.prisma.package_reviews.findUnique({
      where: { id },
    });
    if (!review) throw new NotFoundException('Review not found');
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.package_reviews.update({
        where: { id },
        data: { status, updated_at: new Date() },
      });
      await tx.admin_activity_log.create({
        data: {
          admin_id: adminId,
          action:
            status === ReviewStatus.PUBLISHED
              ? 'publish_review'
              : 'hide_review',
          table_name: 'package_reviews',
          record_id: id,
          description: `${status === ReviewStatus.PUBLISHED ? 'Published' : 'Hidden'} review #${id}`,
          changes: { from: review.status, to: status },
        },
      });
      return result;
    });
    return updated;
  }
}
