import {
  IsString,
  IsOptional,
  IsBoolean,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePageDto {
  @ApiProperty({ example: 'من نحن' })
  @IsString()
  @MaxLength(255)
  title_ar!: string;

  @ApiProperty({ example: 'About Us' })
  @IsString()
  @MaxLength(255)
  title_en!: string;

  @ApiProperty({ example: 'about' })
  @IsString()
  @MaxLength(255)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content_ar?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content_en?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meta_description_ar?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meta_description_en?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdatePageDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title_ar?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() title_en?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() content_ar?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() content_en?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() meta_description_ar?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() meta_description_en?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_active?: boolean;
}
