import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { ReviewStatus } from '../common/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto, PublicReviewFilterDto } from './dto';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

const completedOrder = (overrides: Record<string, unknown> = {}) => ({
  id: 10,
  user_id: 3,
  package_id: 5,
  status: 'completed',
  payments: [{ status: 'paid' }],
  ...overrides,
});

describe('ReviewsService', () => {
  let prisma: any;
  let service: ReviewsService;

  beforeEach(() => {
    prisma = {
      orders: { findUnique: vi.fn() },
      package_reviews: {
        aggregate: vi.fn().mockResolvedValue({ _avg: { rating: null } }),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        groupBy: vi.fn().mockResolvedValue([]),
        update: vi.fn(),
      },
      admin_activity_log: { create: vi.fn() },
      $transaction: vi.fn(async (input: any) =>
        typeof input === 'function' ? input(prisma) : Promise.all(input),
      ),
    };
    service = new ReviewsService(prisma as PrismaService);
  });

  it('keeps review creation protected while the public list is explicitly public', () => {
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        ReviewsController.prototype.listPublished,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, ReviewsController.prototype.create),
    ).not.toBe(true);
  });

  it.each([0, 6])('rejects an out-of-range rating of %s', async (rating) => {
    const dto = plainToInstance(CreateReviewDto, {
      order_id: 10,
      rating,
      comment: 'Helpful review',
    });

    await expect(validate(dto)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'rating' })]),
    );
  });

  it('blocks a customer from reviewing another customer order', async () => {
    prisma.orders.findUnique.mockResolvedValue(completedOrder({ user_id: 99 }));
    await expect(
      service.create(3, { order_id: 10, rating: 5, comment: 'Excellent' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.package_reviews.create).not.toHaveBeenCalled();
  });

  it('blocks reviews before an order is completed', async () => {
    prisma.orders.findUnique.mockResolvedValue(
      completedOrder({ status: 'in_progress' }),
    );
    await expect(
      service.create(3, { order_id: 10, rating: 5, comment: 'Excellent' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks reviews for an order without a confirmed payment', async () => {
    prisma.orders.findUnique.mockResolvedValue(
      completedOrder({ payments: [{ status: 'failed' }] }),
    );
    await expect(
      service.create(3, { order_id: 10, rating: 5, comment: 'Excellent' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates one pending review for a completed paid order', async () => {
    prisma.orders.findUnique.mockResolvedValue(completedOrder());
    prisma.package_reviews.findUnique.mockResolvedValue(null);
    prisma.package_reviews.create.mockResolvedValue({ id: 1 });

    await service.create(3, {
      order_id: 10,
      rating: 5,
      comment: ' Excellent ',
    });

    expect(prisma.package_reviews.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user_id: 3,
        package_id: 5,
        order_id: 10,
        rating: 5,
        comment: 'Excellent',
        status: ReviewStatus.PENDING,
      }),
    });
  });

  it('prevents a duplicate review for the same order', async () => {
    prisma.orders.findUnique.mockResolvedValue(completedOrder());
    prisma.package_reviews.findUnique.mockResolvedValue({ id: 1 });
    await expect(
      service.create(3, { order_id: 10, rating: 4, comment: 'Good' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns only published reviews and calculates their summary', async () => {
    prisma.package_reviews.findMany.mockResolvedValue([
      {
        id: 1,
        user_id: 3,
        package_id: 5,
        order_id: 10,
        rating: 5,
        comment: 'Excellent',
        status: 'published',
        user: {
          name: 'Ahmed Mansour',
          first_name: 'Ahmed',
          last_name: 'Mansour',
        },
        package: { id: 5, name_en: 'Professional CV' },
        order: { id: 10, order_number: 'SANAD-10', status: 'completed' },
      },
    ]);
    prisma.package_reviews.count.mockResolvedValue(1);
    prisma.package_reviews.aggregate.mockResolvedValue({ _avg: { rating: 5 } });
    prisma.package_reviews.groupBy.mockResolvedValue([
      { rating: 5, _count: { rating: 1 } },
    ]);
    const query = Object.assign(new PublicReviewFilterDto(), {
      page: 1,
      limit: 20,
    });

    const result = await service.listPublished(query);

    expect(prisma.package_reviews.findMany.mock.calls[0][0].where).toEqual({
      status: ReviewStatus.PUBLISHED,
    });
    expect(result.data.summary.average_rating).toBe(5);
    expect(result.data.items[0].customer_display_name).toBe('Ahmed M.');
    expect(result.data.items[0].verified_customer).toBe(true);
  });

  it('resets an edited review to pending moderation', async () => {
    prisma.package_reviews.findUnique.mockResolvedValue({
      id: 1,
      user_id: 3,
      status: 'published',
    });
    prisma.package_reviews.update.mockResolvedValue({ id: 1 });
    await service.update(1, 3, { rating: 4, comment: 'Updated' });
    expect(prisma.package_reviews.update.mock.calls[0][0].data).toEqual(
      expect.objectContaining({ status: ReviewStatus.PENDING }),
    );
  });

  it.each([ReviewStatus.PUBLISHED, ReviewStatus.HIDDEN])(
    'sets moderation status to %s without changing the customer comment',
    async (status) => {
      prisma.package_reviews.findUnique.mockResolvedValue({
        id: 1,
        status: 'pending',
      });
      prisma.package_reviews.update.mockResolvedValue({ id: 1 });
      await service.moderate(1, 7, status);
      expect(
        prisma.package_reviews.update.mock.calls[0][0].data,
      ).not.toHaveProperty('comment');
      expect(prisma.package_reviews.update.mock.calls[0][0].data.status).toBe(
        status,
      );
    },
  );
});
