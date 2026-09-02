import {
  Controller,
  Get,
  Post,
  Delete,
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
import { FilesService } from './files.service';
import { UploadFileDto, UploadDeliverableDto } from './dto';
import { CurrentUser, Roles } from '../common/decorators';
import { UserRole } from '../common/enums';
import { MulterFile } from '../common/interfaces';
import { DOCUMENT_UPLOAD_OPTIONS } from './file-validation';

@ApiTags('Files')
@ApiBearerAuth('bearer')
@Controller('orders')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post(':id/files')
  @ApiOperation({
    summary: 'Upload customer document (old CV, certificate, etc.)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        category: { type: 'string', example: 'cv' },
        description: { type: 'string', example: 'My old CV in PDF' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', DOCUMENT_UPLOAD_OPTIONS))
  async uploadCustomerFile(
    @Param('id', ParseIntPipe) orderId: number,
    @CurrentUser('id') userId: number,
    @UploadedFile() file: MulterFile,
    @Body() dto: UploadFileDto,
  ) {
    return this.filesService.uploadCustomerFile(
      orderId,
      userId,
      file,
      dto.category,
      dto.description,
    );
  }

  @Get(':id/files')
  @ApiOperation({
    summary: 'List all files for an order with signed download URLs',
  })
  async getOrderFiles(
    @Param('id', ParseIntPipe) orderId: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') role: string,
  ) {
    const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
    return this.filesService.getOrderFiles(orderId, userId, isAdmin);
  }

  @Delete(':id/files/:fileId')
  @ApiOperation({ summary: 'Delete an uploaded customer file' })
  async deleteCustomerFile(
    @Param('id', ParseIntPipe) orderId: number,
    @Param('fileId', ParseIntPipe) fileId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.filesService.deleteCustomerFile(orderId, fileId, userId);
  }

  @Get(':id/deliverables')
  @ApiOperation({ summary: 'Get signed download URLs for final deliverables' })
  async getDeliverables(
    @Param('id', ParseIntPipe) orderId: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') role: string,
  ) {
    const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
    return this.filesService.getDeliverables(orderId, userId, isAdmin);
  }
}

@ApiTags('Admin')
@ApiBearerAuth('bearer')
@Roles(UserRole.ADMIN)
@Controller('admin/orders')
export class AdminFilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post(':id/deliverables')
  @ApiOperation({ summary: 'Upload final deliverable file (Admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        deliverable_type: { type: 'string', example: 'final_cv_pdf' },
        notes: { type: 'string', example: 'Final ATS-friendly CV' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', DOCUMENT_UPLOAD_OPTIONS))
  async uploadDeliverable(
    @Param('id', ParseIntPipe) orderId: number,
    @CurrentUser('id') adminId: number,
    @UploadedFile() file: MulterFile,
    @Body() dto: UploadDeliverableDto,
  ) {
    return this.filesService.uploadDeliverable(
      orderId,
      adminId,
      file,
      dto.deliverable_type,
      dto.notes,
    );
  }
}
