import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { PaginationDto, ToBoolean } from '../../common/utils';

export class NotificationQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by unread status only' })
  @IsOptional()
  @IsBoolean()
  @ToBoolean()
  unread_only?: boolean;
}
