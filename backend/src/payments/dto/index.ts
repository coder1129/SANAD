import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsIn,
  Min,
  IsEnum,
  IsDateString,
  MaxLength,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/utils';
import { PaymentMethod, PaymentStatus } from '../../common/enums';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Order ID to pay for', example: 1 })
  @IsInt()
  @Type(() => Number)
  order_id!: number;

  @ApiPropertyOptional({
    description: 'Payment method e.g. card, apple_pay',
    example: 'card',
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  payment_method?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Return URL after payment completes' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  return_url?: string;
}

export class PaymentWebhookDto {
  @ApiProperty({ example: 'txn_1740685000_a1b2c3d4' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  transaction_id!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Type(() => Number)
  order_id!: number;

  @ApiProperty({
    enum: ['paid', 'completed', 'success', 'failed'],
    example: 'paid',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['paid', 'completed', 'success', 'failed'])
  status!: string;

  @ApiProperty({ example: 719.1 })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount!: number;

  @ApiPropertyOptional({ example: 'AED' })
  @IsOptional()
  @IsString()
  @IsIn(['AED'])
  currency?: string;
}

export class ConfirmManualPaymentDto {
  @ApiProperty({ description: 'Order ID whose external payment was received' })
  @IsInt()
  @Type(() => Number)
  order_id!: number;

  @ApiProperty({ example: 400 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9_999_999.99)
  @Type(() => Number)
  amount!: number;

  @ApiProperty({
    enum: ['payment_link', 'qr_code', 'bank_transfer', 'cash', 'other'],
    example: 'payment_link',
  })
  @IsString()
  @IsIn(['payment_link', 'qr_code', 'bank_transfer', 'cash', 'other'])
  payment_method!:
    'payment_link' | 'qr_code' | 'bank_transfer' | 'cash' | 'other';

  @ApiPropertyOptional({
    description: 'Reference supplied by the external payment channel',
    example: 'PAYLINK-48291',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  transaction_reference?: string;

  @ApiPropertyOptional({
    description: 'When the money was received; defaults to now',
  })
  @IsOptional()
  @IsDateString()
  payment_date?: string;

  @ApiPropertyOptional({ description: 'Private reconciliation note' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class PaymentFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by payment status e.g. paid, pending, failed',
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ description: 'Filter by transaction ID' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  transaction_id?: string;

  @ApiPropertyOptional({ description: 'Filter by order ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  order_id?: number;
}
