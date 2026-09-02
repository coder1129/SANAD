import { IsOptional, IsBoolean, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto, ToBoolean } from '../../common/utils';

export class CustomerFilterDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by account lock status' })
  @IsOptional()
  @IsBoolean()
  @ToBoolean()
  account_locked?: boolean;
}

export class UpdateCustomerStatusDto {
  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  account_locked!: boolean;

  @ApiPropertyOptional({ example: 'Suspicious activity detected' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ActivityLogFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by admin action e.g. update_order_status',
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    description: 'Filter by table name e.g. orders, packages',
  })
  @IsOptional()
  @IsString()
  table_name?: string;
}
