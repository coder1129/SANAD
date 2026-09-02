import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsInt,
  IsDateString,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType } from '../../common/enums';

export class ValidateCouponDto {
  @ApiProperty({ example: 'WELCOME10' })
  @IsString()
  code!: string;

  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  package_id!: number;
}

export class CreateCouponDto {
  @ApiProperty() @IsString() code!: string;
  @ApiProperty({ enum: DiscountType })
  @IsEnum(DiscountType)
  discount_type!: DiscountType;
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(1000000)
  @Type(() => Number)
  discount_value!: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  min_order_amount?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  max_discount_amount?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  usage_limit?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  usage_per_user?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() start_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() end_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_active?: boolean;
}

export class UpdateCouponDto {
  @ApiPropertyOptional() @IsOptional() @IsString() code?: string;
  @ApiPropertyOptional({ enum: DiscountType })
  @IsOptional()
  @IsEnum(DiscountType)
  discount_type?: DiscountType;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000000)
  @Type(() => Number)
  discount_value?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  min_order_amount?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  max_discount_amount?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  usage_limit?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  usage_per_user?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() start_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() end_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_active?: boolean;
}
