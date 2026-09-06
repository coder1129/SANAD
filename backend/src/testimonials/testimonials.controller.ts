import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TestimonialsService } from './testimonials.service';
import { CreateTestimonialDto, UpdateTestimonialDto } from './dto';
import { Public, Roles } from '../common/decorators';
import { UserRole } from '../common/enums';
import { PaginationDto } from '../common/utils';

@ApiTags('Testimonials')
@Controller('testimonials')
export class TestimonialsController {
  constructor(private readonly testimonialsService: TestimonialsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all published client testimonials' })
  async findAllPublished(@Query('package_id') packageId?: string) {
    if (packageId === undefined || packageId.trim() === '') {
      return this.testimonialsService.findAllPublished();
    }

    const parsedPackageId = Number(packageId);
    if (!Number.isSafeInteger(parsedPackageId) || parsedPackageId <= 0) {
      throw new BadRequestException({
        message: 'package_id must be a positive integer',
        code: 'INVALID_PACKAGE_ID',
      });
    }

    return this.testimonialsService.findAllPublished(parsedPackageId);
  }
}

@ApiTags('Admin')
@ApiBearerAuth('bearer')
@Roles(UserRole.ADMIN)
@Controller('admin/testimonials')
export class AdminTestimonialsController {
  constructor(private readonly testimonialsService: TestimonialsService) {}

  @Get()
  @ApiOperation({ summary: 'List all testimonials (Admin)' })
  async findAll(@Query() query: PaginationDto) {
    return this.testimonialsService.findAllAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get testimonial details (Admin)' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.testimonialsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new testimonial (Admin)' })
  async create(@Body() dto: CreateTestimonialDto) {
    return this.testimonialsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a testimonial (Admin)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTestimonialDto,
  ) {
    return this.testimonialsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a testimonial (Admin)' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.testimonialsService.remove(id);
  }
}
