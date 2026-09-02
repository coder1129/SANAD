import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTestimonialDto {
  @ApiProperty({ example: 'أحمد المنصوري' })
  @IsString()
  customer_name!: string;

  @ApiPropertyOptional({ example: 'مدير تنفيذي لتطوير الأعمال' })
  @IsOptional()
  @IsString()
  customer_title?: string;

  @ApiPropertyOptional({ example: 'https://cdn.sanad.ae/avatars/ahmed.jpg' })
  @IsOptional()
  @IsString()
  customer_image?: string;

  @ApiProperty({
    example:
      'خدمة كتابة سيرة ذاتية ممتازة ساعدتني في الحصول على 4 مقابلات وظيفية خلال أسبوعين!',
  })
  @IsString()
  testimonial_ar!: string;

  @ApiProperty({
    example:
      'Excellent CV writing service that helped me land 4 job interviews in just two weeks!',
  })
  @IsString()
  testimonial_en!: string;

  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_published?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  display_order?: number;
}

export class UpdateTestimonialDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customer_name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customer_title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customer_image?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() testimonial_ar?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() testimonial_en?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_published?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  display_order?: number;
}
