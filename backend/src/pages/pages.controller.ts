import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PagesService } from './pages.service';
import { CreatePageDto, UpdatePageDto } from './dto';
import { Public, Roles } from '../common/decorators';
import { UserRole } from '../common/enums';
import { PaginationDto } from '../common/utils';

@ApiTags('Pages')
@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Public()
  @Get(':slug')
  @ApiOperation({
    summary: 'Get public page content by slug (e.g. about, privacy, terms)',
  })
  async findBySlug(@Param('slug') slug: string) {
    return this.pagesService.findBySlug(slug);
  }
}

@ApiTags('Admin')
@ApiBearerAuth('bearer')
@Roles(UserRole.ADMIN)
@Controller('admin/pages')
export class AdminPagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get()
  @ApiOperation({ summary: 'List all CMS pages (Admin)' })
  async findAll(@Query() query: PaginationDto) {
    return this.pagesService.findAllAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get CMS page details (Admin)' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pagesService.findOneAdmin(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new CMS page (Admin)' })
  async create(@Body() dto: CreatePageDto) {
    return this.pagesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a CMS page (Admin)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePageDto,
  ) {
    return this.pagesService.update(id, dto);
  }
}
