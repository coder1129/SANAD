import { IsOptional, IsBoolean, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto, ToBoolean } from '../../common/utils';

export class DashboardFilterDto {
  @ApiPropertyOptional({
    description: 'Inclusive analytics range start as an ISO-8601 timestamp',
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({
    description: 'Inclusive analytics range end as an ISO-8601 timestamp',
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;
}

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
