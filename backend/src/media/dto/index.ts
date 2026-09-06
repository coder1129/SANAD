import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Matches,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ToBoolean } from '../../common/utils';

export class UploadSiteMediaDto {
  @ApiProperty({ example: 'hero_banner' })
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9_-]+$/)
  media_key!: string;

  @ApiPropertyOptional({ example: 'بانر الصفحة الرئيسية' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  alt_text_ar?: string;

  @ApiPropertyOptional({ example: 'Homepage hero banner' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  alt_text_en?: string;
}

export class UploadPackageImageDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  is_primary?: boolean;

  @ApiPropertyOptional({ example: 'صورة الباقة الترويجية' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  alt_text?: string;
}

export class UpdateSiteMediaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  alt_text_en?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdatePackageImageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  alt_text?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  display_order?: number;
}
