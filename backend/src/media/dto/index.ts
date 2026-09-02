import {
  IsString,
  IsOptional,
  IsBoolean,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  @IsBoolean()
  is_primary?: boolean;

  @ApiPropertyOptional({ example: 'صورة الباقة الترويجية' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  alt_text?: string;
}
