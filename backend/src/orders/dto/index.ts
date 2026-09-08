import {
  IsInt,
  IsOptional,
  IsString,
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsDateString,
  IsEnum,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/utils';
import { OrderStatus } from '../../common/enums';

export class OrderRequirementsDto {
  @ApiPropertyOptional({ example: 'Senior Product Manager' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  target_job_title?: string;

  @ApiPropertyOptional({ example: 'FinTech / SaaS' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  target_industry?: string;

  @ApiPropertyOptional({ example: '7 years' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  years_of_experience?: string;

  @ApiPropertyOptional({ example: 'Bachelor in Computer Science' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  education?: string;

  @ApiPropertyOptional({
    example: 'Product Strategy, Agile, OKRs, Data Analysis',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  key_skills?: string;

  @ApiPropertyOptional({ example: 'https://linkedin.com/in/username' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  linkedin_url?: string;

  @ApiPropertyOptional({ example: 'https://portfolio.me' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  portfolio_url?: string;

  @ApiPropertyOptional({ example: 'United Arab Emirates / Saudi Arabia' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  target_country?: string;

  @ApiPropertyOptional({ example: 'Targeting tier-1 tech companies' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  career_goals?: string;

  @ApiPropertyOptional({ example: 'Please focus on leadership achievements' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  special_notes?: string;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'Package ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  package_id!: number;

  @ApiPropertyOptional({ description: 'Optional Offer ID', example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  offer_id?: number;

  @ApiPropertyOptional({ description: 'Second package unlocked by a cross-service offer' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  secondary_package_id?: number;

  @ApiPropertyOptional({
    description: 'Optional Coupon Code',
    example: 'SAVE10',
  })
  @IsOptional()
  @IsString()
  coupon_code?: string;

  @ApiPropertyOptional({
    description: 'Customer Name override (defaults to user name)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  customer_name?: string;

  @ApiPropertyOptional({
    description: 'Customer Email override (defaults to user email)',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  customer_email?: string;

  @ApiPropertyOptional({
    description: 'Customer Phone (defaults to user phone)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  customer_phone?: string;

  @ApiPropertyOptional({ description: 'Special customer notes' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Structured career requirements payload',
    type: OrderRequirementsDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => OrderRequirementsDto)
  requirements?: OrderRequirementsDto;
}

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: [
      'pending',
      'pending_payment',
      'paid',
      'awaiting_information',
      'received',
      'in_progress',
      'under_review',
      'ready',
      'completed',
      'cancelled',
      'refunded',
    ],
    example: 'in_progress',
  })
  @IsEnum(OrderStatus)
  @IsNotEmpty()
  status!: OrderStatus;

  @ApiPropertyOptional({
    description: 'Reason or note for status transition',
    example: 'Customer information received and assigned to writer',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateOrderAdminDto {
  @ApiPropertyOptional({ description: 'Admin private notes' })
  @IsOptional()
  @IsString()
  admin_notes?: string;

  @ApiPropertyOptional({ description: 'Updated delivery date' })
  @IsOptional()
  @IsDateString()
  delivery_date?: string;

  @ApiPropertyOptional({ description: 'Customer notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class OrderFilterDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by order status' })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'Filter by package ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  package_id?: number;

  @ApiPropertyOptional({ description: 'Start date filter (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ description: 'End date filter (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  end_date?: string;
}
