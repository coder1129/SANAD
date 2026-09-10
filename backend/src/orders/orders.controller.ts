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
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  OrderFilterDto,
  UpdateOrderStatusDto,
  UpdateOrderAdminDto,
  BulkCompleteOrdersDto,
} from './dto';
import { CurrentUser, Roles } from '../common/decorators';
import { UserRole } from '../common/enums';

@ApiTags('Orders')
@ApiBearerAuth('bearer')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order (Authenticated Customer)' })
  async create(@CurrentUser('id') userId: number, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List customer own orders' })
  async findAllCustomer(
    @CurrentUser('id') userId: number,
    @Query() query: OrderFilterDto,
  ) {
    return this.ordersService.findAllCustomer(userId, query);
  }

  @Get('number/:orderNumber')
  @ApiOperation({
    summary: 'Get a customer order by its public order number',
  })
  async findByNumberCustomer(
    @Param('orderNumber') orderNumber: string,
    @CurrentUser('id') userId: number,
  ) {
    return this.ordersService.findByNumberCustomer(orderNumber, userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get customer order details with status history',
  })
  async findOneCustomer(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.ordersService.findOneCustomer(id, userId);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel pending order by customer' })
  async cancelCustomer(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.ordersService.cancelCustomer(id, userId);
  }
}

@ApiTags('Admin')
@ApiBearerAuth('bearer')
@Roles(UserRole.ADMIN)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List all orders with filters (Admin)' })
  async findAll(@Query() query: OrderFilterDto) {
    return this.ordersService.findAllAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get complete order details (Admin)' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOneAdmin(id);
  }

  @Patch('bulk/complete')
  @ApiOperation({
    summary: 'Mark up to 100 paid active orders as completed (Admin)',
  })
  async completeBulk(
    @CurrentUser('id') adminId: number,
    @Body() dto: BulkCompleteOrdersDto,
  ) {
    return this.ordersService.completeBulkAdmin(dto.order_ids, adminId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status with audit trail (Admin)' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') adminId: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatusAdmin(id, adminId, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update order admin notes or delivery date (Admin)',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') adminId: number,
    @Body() dto: UpdateOrderAdminDto,
  ) {
    return this.ordersService.updateAdmin(id, adminId, dto);
  }
}
