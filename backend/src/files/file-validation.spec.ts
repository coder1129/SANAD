import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import {
  DOCUMENT_UPLOAD_OPTIONS,
  MAX_UPLOAD_BYTES,
  validateFileSignature,
} from './file-validation';
import { MulterFile } from '../common/interfaces';

function file(mimetype: string, bytes: number[]): MulterFile {
  const buffer = Buffer.from(bytes);
  return {
    fieldname: 'file',
    originalname: 'upload.bin',
    encoding: '7bit',
    mimetype,
    size: buffer.length,
    destination: '',
    filename: 'upload.bin',
    path: '',
    buffer,
  };
}

describe('file validation', () => {
  it.each([
    ['application/pdf', [0x25, 0x50, 0x44, 0x46]],
    ['image/jpeg', [0xff, 0xd8, 0xff]],
    ['image/png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    [
      'image/webp',
      [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
    ],
    ['application/msword', [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]],
    [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      [0x50, 0x4b, 0x03, 0x04],
    ],
  ])('accepts a valid %s signature', (mimetype, bytes) => {
    expect(() => validateFileSignature(file(mimetype, bytes))).not.toThrow();
  });

  it('rejects content that does not match the declared MIME type', () => {
    expect(() =>
      validateFileSignature(file('application/pdf', [0x4d, 0x5a])),
    ).toThrow(BadRequestException);
  });

  it('rejects unsupported MIME types before buffering', () => {
    const callback = vi.fn();
    DOCUMENT_UPLOAD_OPTIONS.fileFilter?.(
      {} as never,
      file('application/x-msdownload', [0x4d, 0x5a]) as Express.Multer.File,
      callback,
    );

    expect(callback).toHaveBeenCalledWith(
      expect.any(BadRequestException),
      false,
    );
    expect(DOCUMENT_UPLOAD_OPTIONS.limits?.fileSize).toBe(MAX_UPLOAD_BYTES);
  });
});
