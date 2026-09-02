import {
  IsString,
  IsOptional,
  IsObject,
  IsIn,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSettingsDto {
  @ApiProperty({
    description: 'Key-value map of settings to update',
    example: {
      site_name: 'سند للخدمات المهنية',
      support_email: 'support@sanad.ae',
      currency: 'AED',
    },
  })
  @IsObject()
  settings!: Record<string, string>;
}

export class CreateOrUpdateSettingDto {
  @ApiProperty({ example: 'whatsapp_number' })
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z][a-z0-9_]*$/)
  setting_key!: string;

  @ApiPropertyOptional({ example: '+971501234567' })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  setting_value?: string;

  @ApiPropertyOptional({ example: 'string' })
  @IsOptional()
  @IsString()
  @IsIn(['string', 'number', 'boolean', 'json'])
  setting_type?: string;

  @ApiPropertyOptional({ example: 'Customer WhatsApp contact number' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
