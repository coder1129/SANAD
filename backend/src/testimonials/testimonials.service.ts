import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTestimonialDto, UpdateTestimonialDto } from './dto';
import { PaginationDto, createPaginatedResponse } from '../common/utils';

@Injectable()
export class TestimonialsService {
  constructor(private readonly prisma: PrismaService) {}

  // Public: published only
  async findAllPublished(packageId?: number) {
    return this.prisma.testimonials.findMany({
      where: {
        is_published: true,
        ...(packageId === undefined ? {} : { package_id: packageId }),
      },
      orderBy: [{ display_order: 'asc' }, { created_at: 'desc' }],
    });
  }

  // Admin: all with pagination & search
  async findAllAdmin(query: PaginationDto) {
    const where: Record<string, any> = {};
    if (query.search) {
      where.OR = [
        { customer_name: { contains: query.search, mode: 'insensitive' } },
        { customer_title: { contains: query.search, mode: 'insensitive' } },
        { testimonial_ar: { contains: query.search, mode: 'insensitive' } },
        { testimonial_en: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.testimonials.findMany({
        where,
        orderBy: [{ display_order: 'asc' }, { created_at: 'desc' }],
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.testimonials.count({ where }),
    ]);

    return createPaginatedResponse(items, total, query.page, query.limit);
  }

  async findOne(id: number) {
    const testimonial = await this.prisma.testimonials.findUnique({
      where: { id },
    });
    if (!testimonial) throw new NotFoundException('Testimonial not found');
    return testimonial;
  }

  async create(dto: CreateTestimonialDto) {
    return this.prisma.testimonials.create({
      data: {
        ...(dto.package_id === undefined ? {} : { package_id: dto.package_id }),
        customer_name: dto.customer_name,
        customer_title: dto.customer_title,
        customer_image: dto.customer_image,
        testimonial_ar: dto.testimonial_ar,
        testimonial_en: dto.testimonial_en,
        rating: dto.rating ?? 5,
        is_published: dto.is_published ?? true,
        display_order: dto.display_order ?? 0,
      },
    });
  }

  async update(id: number, dto: UpdateTestimonialDto) {
    await this.findOne(id);
    return this.prisma.testimonials.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.testimonials.delete({ where: { id } });
  }
}
