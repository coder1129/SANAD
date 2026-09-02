import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePageDto, UpdatePageDto } from './dto';
import { PaginationDto, createPaginatedResponse } from '../common/utils';

@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  // Public: find by slug
  async findBySlug(slug: string) {
    const page = await this.prisma.pages.findUnique({
      where: { slug: slug.toLowerCase().trim() },
    });

    if (!page || !page.is_active) {
      throw new NotFoundException({
        message: 'Page not found',
        code: 'PAGE_NOT_FOUND',
      });
    }

    return page;
  }

  // Admin
  async findAllAdmin(query: PaginationDto) {
    const where: Record<string, any> = {};
    if (query.search) {
      where.OR = [
        { title_ar: { contains: query.search, mode: 'insensitive' } },
        { title_en: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.pages.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.pages.count({ where }),
    ]);

    return createPaginatedResponse(items, total, query.page, query.limit);
  }

  async findOneAdmin(id: number) {
    const page = await this.prisma.pages.findUnique({ where: { id } });
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  async create(dto: CreatePageDto) {
    const slug = dto.slug.toLowerCase().trim();
    const existing = await this.prisma.pages.findUnique({ where: { slug } });
    if (existing) {
      throw new BadRequestException({
        message: 'Page slug already exists',
        code: 'SLUG_EXISTS',
      });
    }

    return this.prisma.pages.create({
      data: {
        title_ar: dto.title_ar,
        title_en: dto.title_en,
        slug,
        content_ar: dto.content_ar,
        content_en: dto.content_en,
        meta_description_ar: dto.meta_description_ar,
        meta_description_en: dto.meta_description_en,
        is_active: dto.is_active ?? true,
      },
    });
  }

  async update(id: number, dto: UpdatePageDto) {
    await this.findOneAdmin(id);

    if (dto.slug) {
      const slug = dto.slug.toLowerCase().trim();
      const existing = await this.prisma.pages.findFirst({
        where: { slug, id: { not: id } },
      });
      if (existing) {
        throw new BadRequestException({
          message: 'Slug is already used by another page',
          code: 'SLUG_EXISTS',
        });
      }
    }

    return this.prisma.pages.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.slug && { slug: dto.slug.toLowerCase().trim() }),
      },
    });
  }
}
