import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfferDto, UpdateOfferDto } from './dto';
import { PaginationDto, createPaginatedResponse } from '../common/utils';

@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPublic() {
    const now = new Date();
    return this.prisma.offers.findMany({
      where: {
        is_active: true,
        start_date: { lte: now },
        end_date: { gte: now },
      },
      include: {
        package: {
          select: {
            id: true,
            name_ar: true,
            name_en: true,
            price: true,
            is_active: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findAllAdmin(query: PaginationDto) {
    const where: Record<string, unknown> = {};
    if (query.search) {
      where.OR = [
        { name_ar: { contains: query.search, mode: 'insensitive' } },
        { name_en: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.offers.findMany({
        where,
        include: {
          package: {
            select: { id: true, name_ar: true, name_en: true, price: true },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.offers.count({ where }),
    ]);

    return createPaginatedResponse(items, total, query.page, query.limit);
  }

  async findOneAdmin(id: number) {
    const offer = await this.prisma.offers.findUnique({
      where: { id },
      include: { package: true },
    });
    if (!offer) throw new NotFoundException('Offer not found');
    return offer;
  }

  async create(dto: CreateOfferDto) {
    if (new Date(dto.end_date) <= new Date(dto.start_date)) {
      throw new BadRequestException('End date must be after start date');
    }

    const pkg = await this.prisma.packages.findUnique({
      where: { id: dto.package_id },
    });
    if (!pkg) throw new NotFoundException('Package not found');

    return this.prisma.offers.create({
      data: {
        package_id: dto.package_id,
        name_ar: dto.name_ar,
        name_en: dto.name_en,
        description_ar: dto.description_ar,
        description_en: dto.description_en,
        discount_percentage: dto.discount_percentage,
        start_date: new Date(dto.start_date),
        end_date: new Date(dto.end_date),
        is_active: dto.is_active ?? true,
      },
      include: { package: true },
    });
  }

  async update(id: number, dto: UpdateOfferDto) {
    const current = await this.findOneAdmin(id);
    const startDate = dto.start_date
      ? new Date(dto.start_date)
      : current.start_date;
    const endDate = dto.end_date ? new Date(dto.end_date) : current.end_date;
    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }
    if (dto.package_id !== undefined) {
      const pkg = await this.prisma.packages.findUnique({
        where: { id: dto.package_id },
      });
      if (!pkg) throw new NotFoundException('Package not found');
    }
    return this.prisma.offers.update({
      where: { id },
      data: {
        ...(dto.package_id !== undefined && { package_id: dto.package_id }),
        ...(dto.name_ar !== undefined && { name_ar: dto.name_ar }),
        ...(dto.name_en !== undefined && { name_en: dto.name_en }),
        ...(dto.description_ar !== undefined && {
          description_ar: dto.description_ar,
        }),
        ...(dto.description_en !== undefined && {
          description_en: dto.description_en,
        }),
        ...(dto.discount_percentage !== undefined && {
          discount_percentage: dto.discount_percentage,
        }),
        ...(dto.start_date !== undefined && {
          start_date: new Date(dto.start_date),
        }),
        ...(dto.end_date !== undefined && { end_date: new Date(dto.end_date) }),
        ...(dto.is_active !== undefined && { is_active: dto.is_active }),
      },
      include: { package: true },
    });
  }

  async remove(id: number) {
    await this.findOneAdmin(id);
    const orderCount = await this.prisma.orders.count({
      where: { offer_id: id },
    });
    if (orderCount > 0) {
      return this.prisma.offers.update({
        where: { id },
        data: { is_active: false },
      });
    }
    return this.prisma.offers.delete({ where: { id } });
  }

  // Get active offer for a package
  async getActiveOfferForPackage(packageId: number) {
    const now = new Date();
    return this.prisma.offers.findFirst({
      where: {
        package_id: packageId,
        is_active: true,
        start_date: { lte: now },
        end_date: { gte: now },
      },
    });
  }
}
