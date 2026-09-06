import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePackageDto, UpdatePackageDto } from './dto';
import { PaginationDto, createPaginatedResponse } from '../common/utils';
import { StorageService } from '../files/storage.service';
import { OrderStatus } from '../common/enums';

const PURCHASED_ORDER_STATUSES = [
  OrderStatus.PAID,
  OrderStatus.AWAITING_INFORMATION,
  OrderStatus.RECEIVED,
  OrderStatus.IN_PROGRESS,
  OrderStatus.UNDER_REVIEW,
  OrderStatus.READY,
  OrderStatus.COMPLETED,
];

@Injectable()
export class PackagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private async withPublicImageUrls<T extends { package_images?: any[] }>(
    packageItem: T,
  ): Promise<T> {
    if (!packageItem.package_images) return packageItem;

    return {
      ...packageItem,
      package_images: await Promise.all(
        packageItem.package_images.map(async (image) => ({
          ...image,
          image_url:
            image.image_path.startsWith('/') ||
            /^https?:\/\//i.test(image.image_path)
              ? image.image_path
              : await this.storage.getSignedUrl(image.image_path, 86400),
        })),
      ),
    };
  }

  private async toPublicPackage<
    T extends {
      package_images?: any[];
      _count?: { orders: number };
      package_reviews?: Array<{ rating: number }>;
    },
  >(packageItem: T) {
    const withImages = await this.withPublicImageUrls(packageItem);
    const { _count, package_reviews, ...publicPackage } = withImages;
    const ratings = (package_reviews ?? [])
      .map((review) => review.rating)
      .filter(
        (rating): rating is number =>
          rating !== null && rating >= 1 && rating <= 5,
      );
    const ratingAverage =
      ratings.length > 0
        ? Math.round(
            (ratings.reduce((total, rating) => total + rating, 0) /
              ratings.length) *
              10,
          ) / 10
        : null;

    return {
      ...publicPackage,
      buyer_count: _count?.orders ?? 0,
      rating_average: ratingAverage,
      rating_count: ratings.length,
    };
  }

  // PUBLIC: Get active packages with offers
  async findAllPublic(query: PaginationDto) {
    const where: Record<string, unknown> = { is_active: true };

    if (query.search) {
      where.OR = [
        { name_ar: { contains: query.search, mode: 'insensitive' } },
        { name_en: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.packages.findMany({
        where,
        include: {
          package_images: { orderBy: { display_order: 'asc' } },
          offers: {
            where: {
              is_active: true,
              start_date: { lte: new Date() },
              end_date: { gte: new Date() },
            },
          },
          package_reviews: {
            where: { status: 'published' },
            select: { rating: true },
          },
          _count: {
            select: {
              orders: {
                where: { status: { in: PURCHASED_ORDER_STATUSES } },
              },
            },
          },
        },
        orderBy: { sort_order: 'asc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.packages.count({ where }),
    ]);

    const publicItems = await Promise.all(
      items.map((item) => this.toPublicPackage(item)),
    );

    return createPaginatedResponse(publicItems, total, query.page, query.limit);
  }

  async findOnePublic(id: number) {
    const pkg = await this.prisma.packages.findFirst({
      where: { id, is_active: true },
      include: {
        package_images: { orderBy: { display_order: 'asc' } },
        offers: {
          where: {
            is_active: true,
            start_date: { lte: new Date() },
            end_date: { gte: new Date() },
          },
        },
        package_reviews: {
          where: { status: 'published' },
          select: { rating: true },
        },
        _count: {
          select: {
            orders: {
              where: { status: { in: PURCHASED_ORDER_STATUSES } },
            },
          },
        },
      },
    });

    if (!pkg) {
      throw new NotFoundException('Package not found');
    }
    return this.toPublicPackage(pkg);
  }

  // ADMIN: Full CRUD
  async findAllAdmin(query: PaginationDto) {
    const where: Record<string, unknown> = {};

    if (query.search) {
      where.OR = [
        { name_ar: { contains: query.search, mode: 'insensitive' } },
        { name_en: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Record<string, string> = {};
    const allowedSort = [
      'id',
      'name_ar',
      'name_en',
      'price',
      'sort_order',
      'created_at',
    ];
    if (query.sortBy && allowedSort.includes(query.sortBy)) {
      orderBy[query.sortBy] = query.sortOrder || 'desc';
    } else {
      orderBy['sort_order'] = 'asc';
    }

    const [items, total] = await Promise.all([
      this.prisma.packages.findMany({
        where,
        include: {
          package_images: { orderBy: { display_order: 'asc' } },
          offers: true,
          _count: { select: { orders: true } },
        },
        orderBy,
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.packages.count({ where }),
    ]);

    const itemsWithUrls = await Promise.all(
      items.map((item) => this.withPublicImageUrls(item)),
    );
    return createPaginatedResponse(
      itemsWithUrls,
      total,
      query.page,
      query.limit,
    );
  }

  async findOneAdmin(id: number) {
    const pkg = await this.prisma.packages.findUnique({
      where: { id },
      include: {
        package_images: { orderBy: { display_order: 'asc' } },
        offers: true,
        _count: { select: { orders: true } },
      },
    });

    if (!pkg) {
      throw new NotFoundException('Package not found');
    }
    return this.withPublicImageUrls(pkg);
  }

  async create(dto: CreatePackageDto) {
    return this.prisma.packages.create({
      data: {
        name_ar: dto.name_ar,
        name_en: dto.name_en,
        description_ar: dto.description_ar,
        description_en: dto.description_en,
        price: dto.price,
        features_ar: dto.features_ar ?? [],
        features_en: dto.features_en ?? [],
        is_active: dto.is_active ?? true,
        sort_order: dto.sort_order ?? 0,
        delivery_days: dto.delivery_days ?? 7,
        max_revisions: dto.max_revisions ?? 1,
      },
      include: { package_images: true },
    });
  }

  async update(id: number, dto: UpdatePackageDto) {
    await this.findOneAdmin(id);

    return this.prisma.packages.update({
      where: { id },
      data: {
        ...(dto.name_ar !== undefined && { name_ar: dto.name_ar }),
        ...(dto.name_en !== undefined && { name_en: dto.name_en }),
        ...(dto.description_ar !== undefined && {
          description_ar: dto.description_ar,
        }),
        ...(dto.description_en !== undefined && {
          description_en: dto.description_en,
        }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.features_ar !== undefined && { features_ar: dto.features_ar }),
        ...(dto.features_en !== undefined && { features_en: dto.features_en }),
        ...(dto.is_active !== undefined && { is_active: dto.is_active }),
        ...(dto.sort_order !== undefined && { sort_order: dto.sort_order }),
        ...(dto.delivery_days !== undefined && {
          delivery_days: dto.delivery_days,
        }),
        ...(dto.max_revisions !== undefined && {
          max_revisions: dto.max_revisions,
        }),
      },
      include: { package_images: true },
    });
  }

  async updateStatus(id: number, isActive: boolean) {
    await this.findOneAdmin(id);
    return this.prisma.packages.update({
      where: { id },
      data: { is_active: isActive },
    });
  }

  async remove(id: number) {
    const pkg = await this.prisma.packages.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });

    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    // Soft-delete if orders exist
    if (pkg._count.orders > 0) {
      return this.prisma.packages.update({
        where: { id },
        data: { is_active: false },
      });
    }

    return this.prisma.packages.delete({ where: { id } });
  }
}
