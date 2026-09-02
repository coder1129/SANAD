import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsInt,
  Min,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePackageDto {
  @ApiProperty() @IsString() name_ar!: string;
  @ApiProperty() @IsString() name_en!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description_ar?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description_en?: string;
  @ApiProperty() @IsNumber() @Min(0) @Type(() => Number) price!: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() features_ar?: string[];
  @ApiPropertyOptional() @IsOptional() @IsArray() features_en?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_active?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sort_order?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  delivery_days?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  max_revisions?: number;
}

export class UpdatePackageDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name_ar?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name_en?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description_ar?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description_en?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() features_ar?: string[];
  @ApiPropertyOptional() @IsOptional() @IsArray() features_en?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_active?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sort_order?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  delivery_days?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  max_revisions?: number;
}

export class UpdatePackageStatusDto {
  @ApiProperty() @IsBoolean() is_active!: boolean;
}
