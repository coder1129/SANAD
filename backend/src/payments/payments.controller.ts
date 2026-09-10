import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  Req,
  RawBodyRequest,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import {
  ConfirmManualPaymentDto,
  CreatePaymentDto,
  PaymentWebhookDto,
  PaymentFilterDto,
} from './dto';
import { CurrentUser, Roles, Public } from '../common/decorators';
import { UserRole } from '../common/enums';
import { Request } from 'express';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiBearerAuth('bearer')
  @Post('create')
  @ApiOperation({
    summary:
      'Initiate payment, or return an immediate no-charge confirmation in bypass mode',
  })
  async createPayment(
    @CurrentUser('id') userId: number,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPayment(userId, dto);
  }

  @ApiBearerAuth('bearer')
  @Get(':id')
  @ApiOperation({ summary: 'Get payment status by payment ID' })
  async getPayment(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') role: string,
  ) {
    const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
    return this.paymentsService.getPayment(id, userId, isAdmin);
  }

  @Public()
  @Post('webhook')
  @ApiOperation({
    summary: 'Secure idempotent webhook endpoint for payment gateway callbacks',
  })
  @ApiHeader({
    name: 'x-signature',
    required: true,
    description: 'HMAC-SHA256 signature of the raw request body',
  })
  async handleWebhook(
    @Body() payload: PaymentWebhookDto,
    @Headers('x-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ) {
    return this.paymentsService.handleWebhook(
      payload,
      signature || '',
      request.rawBody || Buffer.alloc(0),
    );
  }
}

@ApiTags('Admin')
@ApiBearerAuth('bearer')
@Roles(UserRole.ADMIN)
@Controller('admin/payments')
export class AdminPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all payments with filters (Admin)' })
  async findAll(@Query() query: PaymentFilterDto) {
    return this.paymentsService.findAllAdmin(query);
  }

  @Post('manual')
  @ApiOperation({
    summary: 'Confirm an externally collected payment for an order (Admin)',
  })
  async confirmManual(
    @CurrentUser('id') adminId: number,
    @Body() dto: ConfirmManualPaymentDto,
  ) {
    return this.paymentsService.confirmManualPayment(adminId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment transaction details (Admin)' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.findOneAdmin(id);
  }
}
