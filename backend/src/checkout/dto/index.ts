import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CheckoutPreviewDto {
  @ApiProperty({ description: 'Package ID to purchase', example: 1 })
  @IsInt()
  @Type(() => Number)
  package_id!: number;

  @ApiPropertyOptional({
    description: 'Optional Offer ID to apply',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  offer_id?: number;

  @ApiPropertyOptional({ description: 'Optional second package unlocked by a cross-service offer' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  secondary_package_id?: number;

  @ApiPropertyOptional({
    description: 'Optional coupon code to apply',
    example: 'SAVE10',
  })
  @IsOptional()
  @IsString()
  coupon_code?: string;
}

export interface PricingBreakdown {
  package_id: number;
  package_name_ar: string;
  package_name_en: string;
  delivery_days: number;
  original_price: number;
  secondary_package_id: number | null;
  secondary_package_name_ar: string | null;
  secondary_package_name_en: string | null;
  secondary_original_price: number;
  secondary_discount_amount: number;
  offer_id: number | null;
  offer_discount_percentage: number;
  offer_discount_amount: number;
  coupon_code: string | null;
  coupon_discount_amount: number;
  subtotal_after_discounts: number;
  total_amount: number;
  final_amount: number;
  currency: string;
}
