import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { MulterFile } from '../common/interfaces';

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

function uploadOptions(allowed: readonly string[]): MulterOptions {
  return {
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 10 },
    fileFilter: (_request, file, callback) => {
      if (!allowed.includes(file.mimetype)) {
        callback(
          new BadRequestException({
            message: 'Unsupported file format',
            code: 'INVALID_FILE_TYPE',
          }),
          false,
        );
        return;
      }
      callback(null, true);
    },
  };
}

export const DOCUMENT_UPLOAD_OPTIONS = uploadOptions(DOCUMENT_MIME_TYPES);
export const IMAGE_UPLOAD_OPTIONS = uploadOptions(IMAGE_MIME_TYPES);

export function validateFileSignature(file: MulterFile): void {
  const bytes = file.buffer;
  const startsWith = (...signature: number[]) =>
    signature.every((value, index) => bytes[index] === value);

  const valid =
    (file.mimetype === 'application/pdf' &&
      startsWith(0x25, 0x50, 0x44, 0x46)) ||
    (file.mimetype === 'image/jpeg' && startsWith(0xff, 0xd8, 0xff)) ||
    (file.mimetype === 'image/png' &&
      startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) ||
    (file.mimetype === 'image/webp' &&
      startsWith(0x52, 0x49, 0x46, 0x46) &&
      bytes.subarray(8, 12).toString('ascii') === 'WEBP') ||
    (file.mimetype === 'application/msword' &&
      startsWith(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1)) ||
    (file.mimetype ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' &&
      startsWith(0x50, 0x4b));

  if (!valid) {
    throw new BadRequestException({
      message: 'File content does not match its declared type',
      code: 'FILE_SIGNATURE_MISMATCH',
    });
  }
}
