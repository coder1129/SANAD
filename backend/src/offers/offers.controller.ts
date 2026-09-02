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
import { OffersService } from './offers.service';
import { CreateOfferDto, UpdateOfferDto } from './dto';
import { Public, Roles } from '../common/decorators';
import { UserRole } from '../common/enums';
import { PaginationDto } from '../common/utils';

@ApiTags('Offers')
@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all active offers (public)' })
  findAll() {
    return this.offersService.findAllPublic();
  }
}

@ApiTags('Admin - Offers')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/offers')
export class AdminOffersController {
  constructor(private readonly offersService: OffersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all offers (admin)' })
  findAll(@Query() query: PaginationDto) {
    return this.offersService.findAllAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get offer by ID (admin)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.offersService.findOneAdmin(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new offer' })
  create(@Body() dto: CreateOfferDto) {
    return this.offersService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an offer' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOfferDto) {
    return this.offersService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an offer' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.offersService.remove(id);
  }
}
