import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PackagesService } from './packages.service';
import {
  CreatePackageDto,
  UpdatePackageDto,
  UpdatePackageStatusDto,
} from './dto';
import { Public, Roles } from '../common/decorators';
import { UserRole } from '../common/enums';
import { PaginationDto } from '../common/utils';

@ApiTags('Packages')
@Controller('packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all active packages (public)' })
  findAll(@Query() query: PaginationDto) {
    return this.packagesService.findAllPublic(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get package by ID (public)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.packagesService.findOnePublic(id);
  }
}

@ApiTags('Admin - Packages')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/packages')
export class AdminPackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all packages (admin)' })
  findAll(@Query() query: PaginationDto) {
    return this.packagesService.findAllAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get package by ID (admin)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.packagesService.findOneAdmin(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new package' })
  create(@Body() dto: CreatePackageDto) {
    return this.packagesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a package' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePackageDto) {
    return this.packagesService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update package active status' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePackageStatusDto,
  ) {
    return this.packagesService.updateStatus(id, dto.is_active);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a package (soft-delete if has orders)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.packagesService.remove(id);
  }
}
