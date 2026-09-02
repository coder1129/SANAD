import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto, CreateOrUpdateSettingDto } from './dto';

const PUBLIC_SETTING_KEYS = [
  'site_name',
  'site_name_en',
  'site_description_ar',
  'site_description_en',
  'support_email',
  'support_phone',
  'whatsapp_number',
  'currency',
  'vat_percentage',
  'facebook_url',
  'twitter_url',
  'linkedin_url',
  'instagram_url',
  'hero_title_ar',
  'hero_title_en',
  'hero_subtitle_ar',
  'hero_subtitle_en',
];

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  // Public: safe key-value dictionary only
  async getPublicSettings(): Promise<Record<string, string | null>> {
    const settings = await this.prisma.settings.findMany({
      where: {
        setting_key: { in: PUBLIC_SETTING_KEYS },
      },
    });

    const result: Record<string, string | null> = {};
    for (const s of settings) {
      result[s.setting_key] = s.setting_value;
    }

    // Default fallbacks if empty
    if (!result.currency) result.currency = 'AED';
    if (!result.vat_percentage) result.vat_percentage = '5';
    if (!result.site_name)
      result.site_name = 'سند | المنصة الأولى للخدمات المهنية';

    return result;
  }

  // Admin: get all settings
  async getAllAdmin() {
    return this.prisma.settings.findMany({
      orderBy: { setting_key: 'asc' },
    });
  }

  // Admin: bulk update settings
  async bulkUpdate(dto: UpdateSettingsDto) {
    const entries = Object.entries(dto.settings);
    if (entries.length > 100) {
      throw new BadRequestException(
        'At most 100 settings can be updated at once',
      );
    }
    for (const [key, value] of entries) this.validateSetting(key, value);

    const updates = entries.map(([key, value]) =>
      this.prisma.settings.upsert({
        where: { setting_key: key },
        update: { setting_value: String(value) },
        create: { setting_key: key, setting_value: String(value) },
      }),
    );

    await this.prisma.$transaction(updates);
    return this.getAllAdmin();
  }

  // Admin: upsert single setting
  async upsertOne(dto: CreateOrUpdateSettingDto) {
    this.validateSetting(dto.setting_key, dto.setting_value ?? '');
    return this.prisma.settings.upsert({
      where: { setting_key: dto.setting_key },
      update: {
        setting_value: dto.setting_value,
        setting_type: dto.setting_type,
        description: dto.description,
      },
      create: {
        setting_key: dto.setting_key,
        setting_value: dto.setting_value,
        setting_type: dto.setting_type || 'string',
        description: dto.description,
      },
    });
  }

  private validateSetting(key: string, value: unknown) {
    if (!/^[a-z][a-z0-9_]{0,99}$/.test(key)) {
      throw new BadRequestException(`Invalid setting key: ${key}`);
    }
    if (!['string', 'number', 'boolean'].includes(typeof value)) {
      throw new BadRequestException(`Invalid value for setting: ${key}`);
    }
    if (String(value).length > 10_000) {
      throw new BadRequestException(`Setting value is too long: ${key}`);
    }
    if (key === 'vat_percentage') {
      const vat = Number(value);
      if (!Number.isFinite(vat) || vat < 0 || vat > 100) {
        throw new BadRequestException(
          'VAT percentage must be between 0 and 100',
        );
      }
    }
    if (key === 'currency' && !/^[A-Z]{3}$/.test(String(value))) {
      throw new BadRequestException(
        'Currency must be a 3-letter uppercase code',
      );
    }
  }
}
