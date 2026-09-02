import { Controller, Get, Patch, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto, CreateOrUpdateSettingDto } from './dto';
import { Public, Roles } from '../common/decorators';
import { UserRole } from '../common/enums';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Public()
  @Get('public')
  @ApiOperation({
    summary: 'Get public site configuration, currency, contact info & SEO',
  })
  async getPublicSettings() {
    return this.settingsService.getPublicSettings();
  }
}

@ApiTags('Admin')
@ApiBearerAuth('bearer')
@Roles(UserRole.ADMIN)
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all system settings (Admin)' })
  async getAll() {
    return this.settingsService.getAllAdmin();
  }

  @Patch()
  @ApiOperation({ summary: 'Bulk update system settings (Admin)' })
  async bulkUpdate(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.bulkUpdate(dto);
  }

  @Post()
  @ApiOperation({ summary: 'Create or update single setting key (Admin)' })
  async upsertOne(@Body() dto: CreateOrUpdateSettingDto) {
    return this.settingsService.upsertOne(dto);
  }
}
