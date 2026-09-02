import {
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
import { CouponsService } from './coupons.service';
import { ValidateCouponDto, CreateCouponDto, UpdateCouponDto } from './dto';
import { Public, Roles, CurrentUser } from '../common/decorators';
import { UserRole } from '../common/enums';
import { PaginationDto } from '../common/utils';

@ApiTags('Coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Public()
  @Post('validate')
  @ApiOperation({ summary: 'Validate coupon and calculate discount preview' })
  async validateCoupon(
    @Body() dto: ValidateCouponDto,
    @CurrentUser('id') userId?: number,
  ) {
    return this.couponsService.validateCoupon(
      dto.code,
      dto.package_id,
      userId || 0,
    );
  }
}

@ApiTags('Admin')
@ApiBearerAuth('bearer')
@Roles(UserRole.ADMIN)
@Controller('admin/coupons')
export class AdminCouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  @ApiOperation({ summary: 'List all coupons (Admin)' })
  async findAll(@Query() query: PaginationDto) {
    return this.couponsService.findAllAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get coupon details with usage stats (Admin)' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.couponsService.findOneAdmin(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new coupon (Admin)' })
  async create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a coupon (Admin)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.couponsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a coupon (Admin)' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.couponsService.remove(id);
  }
}
