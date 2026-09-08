import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface UploadResult {
  key: string;
  url: string;
  size: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client | null = null;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly localStorageDir: string;
  private readonly isS3Configured: boolean;
  private readonly signingSecret: string;

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'R2_SECRET_ACCESS_KEY',
    );
    const endpoint =
      this.configService.get<string>('R2_ENDPOINT') ||
      (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

    this.bucket =
      this.configService.get<string>('R2_BUCKET') || 'sanad-storage';
    this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL') || '';
    this.localStorageDir = path.resolve(process.cwd(), 'uploads');
    this.signingSecret =
      this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');

    if (accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.isS3Configured = true;
      this.logger.log('S3 / Cloudflare R2 storage initialized successfully');
    } else {
      this.isS3Configured = false;
      fs.mkdirSync(this.localStorageDir, { recursive: true });
      this.logger.warn(
        'R2 credentials not provided. Using local disk storage; mount /app/uploads on Railway to preserve files across deployments.',
      );
    }
  }

  async upload(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<UploadResult> {
    const sanitizedKey = key.replace(/\\/g, '/').replace(/^\/+/, '');

    if (this.isS3Configured && this.s3Client) {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: sanitizedKey,
          Body: buffer,
          ContentType: contentType,
        }),
      );

      const url = this.publicUrl
        ? `${this.publicUrl.replace(/\/$/, '')}/${sanitizedKey}`
        : `https://${this.bucket}.r2.cloudflarestorage.com/${sanitizedKey}`;

      return { key: sanitizedKey, url, size: buffer.length };
    } else {
      // Local fallback
      const filePath = this.resolveLocalPath(sanitizedKey);
      const dir = path.dirname(filePath);
      await fsPromises.mkdir(dir, { recursive: true });
      await fsPromises.writeFile(filePath, buffer);
      return {
        key: sanitizedKey,
        url: `/uploads/${sanitizedKey}`,
        size: buffer.length,
      };
    }
  }

  async getSignedUrl(
    key: string,
    expiresInSeconds: number = 3600,
  ): Promise<string> {
    const sanitizedKey = key.replace(/\\/g, '/').replace(/^\/+/, '');

    if (this.isS3Configured && this.s3Client) {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: sanitizedKey,
      });
      return getSignedUrl(this.s3Client, command, {
        expiresIn: expiresInSeconds,
      });
    } else {
      const expires = Date.now() + expiresInSeconds * 1000;
      const signature = this.signLocalUrl(sanitizedKey, expires);
      return `/api/v1/storage/local?key=${encodeURIComponent(sanitizedKey)}&expires=${expires}&signature=${signature}`;
    }
  }

  async delete(key: string): Promise<void> {
    const sanitizedKey = key.replace(/\\/g, '/').replace(/^\/+/, '');

    if (this.isS3Configured && this.s3Client) {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: sanitizedKey,
        }),
      );
    } else {
      const filePath = this.resolveLocalPath(sanitizedKey);
      try {
        await fsPromises.unlink(filePath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }
    }
  }

  getVerifiedLocalPath(
    key: string,
    expiresValue: string,
    signature: string,
  ): string {
    if (this.isS3Configured) {
      throw new NotFoundException('Local storage is not enabled');
    }
    const sanitizedKey = key.replace(/\\/g, '/').replace(/^\/+/, '');
    const expires = Number(expiresValue);
    if (!Number.isSafeInteger(expires) || expires <= Date.now()) {
      throw new ForbiddenException('Download link has expired');
    }

    const expected = this.signLocalUrl(sanitizedKey, expires);
    const providedBuffer = Buffer.from(signature || '', 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    if (
      providedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      throw new ForbiddenException('Invalid download signature');
    }

    const filePath = this.resolveLocalPath(sanitizedKey);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      throw new NotFoundException('File not found');
    }
    return filePath;
  }

  private signLocalUrl(key: string, expires: number): string {
    return crypto
      .createHmac('sha256', this.signingSecret)
      .update(`${key}:${expires}`)
      .digest('hex');
  }

  private resolveLocalPath(key: string): string {
    if (!key || key.includes('\0')) {
      throw new BadRequestException('Invalid storage key');
    }
    const target = path.resolve(this.localStorageDir, key);
    const relative = path.relative(this.localStorageDir, target);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new BadRequestException('Invalid storage key');
    }
    return target;
  }
}
