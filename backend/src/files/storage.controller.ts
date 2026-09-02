import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../common/decorators';
import { StorageService } from './storage.service';

@Public()
@ApiExcludeController()
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get('local')
  downloadLocalFile(
    @Query('key') key: string,
    @Query('expires') expires: string,
    @Query('signature') signature: string,
    @Res() response: Response,
  ) {
    const filePath = this.storageService.getVerifiedLocalPath(
      key,
      expires,
      signature,
    );
    return response.sendFile(filePath);
  }
}
