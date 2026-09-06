import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/utils';
import { ReviewStatus } from '../../common/enums';

export class CreateReviewDto {
  @ApiProperty({ description: 'Completed order being reviewed' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  order_id!: number;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating!: number;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(3000)
  comment!: string;
}

export class UpdateReviewDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(3000)
  comment?: string;
}

export class PublicReviewFilterDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  package_id?: number;
}

export class AdminReviewFilterDto extends PublicReviewFilterDto {
  @ApiPropertyOptional({ enum: ReviewStatus })
  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;
}

export class ModerateReviewDto {
  @ApiProperty({ enum: [ReviewStatus.PUBLISHED, ReviewStatus.HIDDEN] })
  @IsEnum(ReviewStatus)
  status!: ReviewStatus;
}
