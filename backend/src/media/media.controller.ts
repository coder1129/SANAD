import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import {
  UpdatePackageImageDto,
  UpdateSiteMediaDto,
  UploadSiteMediaDto,
  UploadPackageImageDto,
} from './dto';
import { Public, Roles, CurrentUser } from '../common/decorators';
import { UserRole } from '../common/enums';
import { MulterFile } from '../common/interfaces';
import { IMAGE_UPLOAD_OPTIONS } from '../files/file-validation';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all active site media assets' })
  async getPublicMedia() {
    return this.mediaService.getPublicMedia();
  }
}

@ApiTags('Admin')
@ApiBearerAuth('bearer')
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminMediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get('media')
  @ApiOperation({ summary: 'List all site media assets (Admin)' })
  async getAllSiteMedia() {
    return this.mediaService.getAllAdmin();
  }

  @Post('media')
  @ApiOperation({ summary: 'Upload site media asset (Admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        media_key: { type: 'string', example: 'hero_banner' },
        alt_text_ar: { type: 'string' },
        alt_text_en: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', IMAGE_UPLOAD_OPTIONS))
  async uploadSiteMedia(
    @UploadedFile() file: MulterFile,
    @Body() dto: UploadSiteMediaDto,
    @CurrentUser('id') adminId: number,
  ) {
    return this.mediaService.uploadSiteMedia(file, dto, adminId);
  }

  @Delete('media/:id')
  @ApiOperation({ summary: 'Delete site media asset (Admin)' })
  async deleteSiteMedia(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') adminId: number,
  ) {
    return this.mediaService.deleteSiteMedia(id, adminId);
  }

  @Patch('media/:id')
  @ApiOperation({ summary: 'Update site media metadata (Admin)' })
  async updateSiteMedia(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSiteMediaDto,
    @CurrentUser('id') adminId: number,
  ) {
    return this.mediaService.updateSiteMedia(id, dto, adminId);
  }

  @Post('packages/:id/images')
  @ApiOperation({ summary: 'Upload image for package (Admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        is_primary: { type: 'boolean', example: true },
        alt_text: { type: 'string', example: 'Package cover' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', IMAGE_UPLOAD_OPTIONS))
  async uploadPackageImage(
    @Param('id', ParseIntPipe) packageId: number,
    @UploadedFile() file: MulterFile,
    @Body() dto: UploadPackageImageDto,
    @CurrentUser('id') adminId: number,
  ) {
    return this.mediaService.uploadPackageImage(packageId, file, dto, adminId);
  }

  @Delete('packages/:packageId/images/:imageId')
  @ApiOperation({ summary: 'Delete package image (Admin)' })
  async deletePackageImage(
    @Param('packageId', ParseIntPipe) packageId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @CurrentUser('id') adminId: number,
  ) {
    return this.mediaService.deletePackageImage(packageId, imageId, adminId);
  }

  @Patch('packages/:packageId/images/:imageId')
  @ApiOperation({ summary: 'Update package image metadata (Admin)' })
  async updatePackageImage(
    @Param('packageId', ParseIntPipe) packageId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @Body() dto: UpdatePackageImageDto,
    @CurrentUser('id') adminId: number,
  ) {
    return this.mediaService.updatePackageImage(
      packageId,
      imageId,
      dto,
      adminId,
    );
  }
}
