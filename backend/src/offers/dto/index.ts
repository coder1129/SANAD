import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsInt,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOfferDto {
  @ApiProperty() @IsInt() @Type(() => Number) package_id!: number;
  @ApiProperty() @IsString() name_ar!: string;
  @ApiProperty() @IsString() name_en!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description_ar?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description_en?: string;
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  discount_percentage!: number;
  @ApiProperty() @IsDateString() start_date!: string;
  @ApiProperty() @IsDateString() end_date!: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_active?: boolean;
}

export class UpdateOfferDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  package_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() name_ar?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name_en?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description_ar?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description_en?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  discount_percentage?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() start_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() end_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_active?: boolean;
}
