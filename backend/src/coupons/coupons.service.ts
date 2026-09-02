import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto, UpdateCouponDto } from './dto';
import { PaginationDto, createPaginatedResponse } from '../common/utils';
import { Prisma } from '@prisma/client';

type PrismaClientLike = PrismaService | Prisma.TransactionClient;

export interface CouponValidationResult {
  valid: boolean;
  couponId?: number;
  discountType?: string;
  discountAmount: number;
  subtotal: number;
  total: number;
  message?: string;
}

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async validateCoupon(
    code: string,
    packageId: number,
    userId: number,
    client: PrismaClientLike = this.prisma,
    options: { lockForUpdate?: boolean; subtotal?: number } = {},
  ): Promise<CouponValidationResult> {
    const normalizedCode = code.toUpperCase().trim();
    if (options.lockForUpdate) {
      await client.$queryRaw`
        SELECT id FROM coupons WHERE code = ${normalizedCode} FOR UPDATE
      `;
    }

    const coupon = await client.coupons.findUnique({
      where: { code: normalizedCode },
    });

    if (!coupon) {
      throw new BadRequestException({
        message: 'Coupon not found',
        code: 'COUPON_NOT_FOUND',
      });
    }

    if (!coupon.is_active) {
      throw new BadRequestException({
        message: 'Coupon is not active',
        code: 'COUPON_INACTIVE',
      });
    }

    const now = new Date();
    if (coupon.start_date && now < coupon.start_date) {
      throw new BadRequestException({
        message: 'Coupon is not yet active',
        code: 'COUPON_NOT_STARTED',
      });
    }

    if (coupon.end_date && now > coupon.end_date) {
      throw new BadRequestException({
        message: 'Coupon has expired',
        code: 'COUPON_EXPIRED',
      });
    }

    if (
      coupon.usage_limit !== null &&
      (coupon.times_used || 0) >= coupon.usage_limit
    ) {
      throw new BadRequestException({
        message: 'Coupon usage limit reached',
        code: 'COUPON_LIMIT_REACHED',
      });
    }

    // Check per-user usage
    if (coupon.usage_per_user !== null && userId > 0) {
      const userUsage = await client.coupon_usage.count({
        where: { coupon_id: coupon.id, user_id: userId },
      });
      if (userUsage >= (coupon.usage_per_user || 1)) {
        throw new BadRequestException({
          message: 'You have already used this coupon',
          code: 'COUPON_ALREADY_USED',
        });
      }
    }

    // Get package price
    const pkg = await client.packages.findUnique({ where: { id: packageId } });
    if (!pkg || !pkg.is_active) {
      throw new BadRequestException({
        message: 'Package not found or inactive',
        code: 'PACKAGE_INVALID',
      });
    }

    const subtotal = options.subtotal ?? Number(pkg.price);

    // Check minimum order amount
    if (coupon.min_order_amount && subtotal < Number(coupon.min_order_amount)) {
      throw new BadRequestException({
        message: `Minimum order amount is ${Number(coupon.min_order_amount)} AED`,
        code: 'COUPON_MIN_AMOUNT',
      });
    }

    // Calculate discount
    let discountAmount: number;
    if (coupon.discount_type === 'percentage') {
      if (Number(coupon.discount_value) > 100) {
        throw new BadRequestException({
          message: 'Percentage coupon value cannot exceed 100',
          code: 'COUPON_VALUE_INVALID',
        });
      }
      discountAmount =
        Math.round(((subtotal * Number(coupon.discount_value)) / 100) * 100) /
        100;
      if (coupon.max_discount_amount) {
        discountAmount = Math.min(
          discountAmount,
          Number(coupon.max_discount_amount),
        );
      }
    } else {
      discountAmount = Math.min(Number(coupon.discount_value), subtotal);
    }

    return {
      valid: true,
      couponId: coupon.id,
      discountType: coupon.discount_type,
      discountAmount,
      subtotal,
      total: Math.round((subtotal - discountAmount) * 100) / 100,
    };
  }

  // Admin CRUD
  async findAllAdmin(query: PaginationDto) {
    const where: Record<string, unknown> = {};
    if (query.search) {
      where.code = { contains: query.search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.prisma.coupons.findMany({
        where,
        include: { _count: { select: { coupon_usage: true } } },
        orderBy: { created_at: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.coupons.count({ where }),
    ]);

    return createPaginatedResponse(items, total, query.page, query.limit);
  }

  async findOneAdmin(id: number) {
    const coupon = await this.prisma.coupons.findUnique({
      where: { id },
      include: {
        coupon_usage: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            order: { select: { id: true, order_number: true } },
          },
          orderBy: { used_at: 'desc' },
          take: 50,
        },
        _count: { select: { coupon_usage: true } },
      },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async create(dto: CreateCouponDto) {
    this.validateCouponDefinition(dto);
    const existing = await this.prisma.coupons.findUnique({
      where: { code: dto.code.toUpperCase().trim() },
    });
    if (existing) {
      throw new BadRequestException({
        message: 'Coupon code already exists',
        code: 'COUPON_CODE_EXISTS',
      });
    }

    return this.prisma.coupons.create({
      data: {
        code: dto.code.toUpperCase().trim(),
        discount_type: dto.discount_type,
        discount_value: dto.discount_value,
        min_order_amount: dto.min_order_amount ?? 0,
        max_discount_amount: dto.max_discount_amount,
        usage_limit: dto.usage_limit,
        usage_per_user: dto.usage_per_user ?? 1,
        start_date: dto.start_date ? new Date(dto.start_date) : null,
        end_date: dto.end_date ? new Date(dto.end_date) : null,
        is_active: dto.is_active ?? true,
      },
    });
  }

  async update(id: number, dto: UpdateCouponDto) {
    const current = await this.findOneAdmin(id);
    this.validateCouponDefinition({
      discount_type: dto.discount_type ?? current.discount_type,
      discount_value: dto.discount_value ?? Number(current.discount_value),
      start_date: dto.start_date ?? current.start_date?.toISOString(),
      end_date: dto.end_date ?? current.end_date?.toISOString(),
    });

    const data: Record<string, unknown> = {};
    if (dto.code !== undefined) data.code = dto.code.toUpperCase().trim();
    if (dto.discount_type !== undefined) data.discount_type = dto.discount_type;
    if (dto.discount_value !== undefined)
      data.discount_value = dto.discount_value;
    if (dto.min_order_amount !== undefined)
      data.min_order_amount = dto.min_order_amount;
    if (dto.max_discount_amount !== undefined)
      data.max_discount_amount = dto.max_discount_amount;
    if (dto.usage_limit !== undefined) data.usage_limit = dto.usage_limit;
    if (dto.usage_per_user !== undefined)
      data.usage_per_user = dto.usage_per_user;
    if (dto.start_date !== undefined)
      data.start_date = new Date(dto.start_date);
    if (dto.end_date !== undefined) data.end_date = new Date(dto.end_date);
    if (dto.is_active !== undefined) data.is_active = dto.is_active;

    return this.prisma.coupons.update({ where: { id }, data });
  }

  async remove(id: number) {
    const coupon = await this.findOneAdmin(id);
    if (coupon._count.coupon_usage > 0) {
      return this.prisma.coupons.update({
        where: { id },
        data: { is_active: false },
      });
    }
    return this.prisma.coupons.delete({ where: { id } });
  }

  private validateCouponDefinition(dto: {
    discount_type: string;
    discount_value: number;
    start_date?: string;
    end_date?: string;
  }) {
    if (dto.discount_type === 'percentage' && dto.discount_value > 100) {
      throw new BadRequestException({
        message: 'Percentage coupon value cannot exceed 100',
        code: 'COUPON_VALUE_INVALID',
      });
    }
    if (
      dto.start_date &&
      dto.end_date &&
      new Date(dto.end_date) <= new Date(dto.start_date)
    ) {
      throw new BadRequestException({
        message: 'Coupon end date must be after start date',
        code: 'COUPON_DATE_RANGE_INVALID',
      });
    }
  }
}
