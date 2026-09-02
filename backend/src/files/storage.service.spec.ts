import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { describe, expect, it, vi } from 'vitest';
import { StorageService } from './storage.service';

function createService() {
  return new StorageService({
    get: vi.fn(() => undefined),
    getOrThrow: vi.fn(
      () => 'local-signing-secret-that-is-at-least-32-characters',
    ),
  } as never);
}

describe('StorageService local signed URLs', () => {
  it('serves only an existing file with an untampered, unexpired signature', async () => {
    const service = createService();
    const key = `security-tests/${randomUUID()}.pdf`;
    try {
      await service.upload(key, Buffer.from('%PDF-test'), 'application/pdf');

      const signed = await service.getSignedUrl(key, 60);
      const params = new URL(signed, 'http://localhost').searchParams;
      const verified = service.getVerifiedLocalPath(
        params.get('key')!,
        params.get('expires')!,
        params.get('signature')!,
      );
      expect(verified).toMatch(/uploads[\\/]security-tests/);

      const originalSignature = params.get('signature')!;
      const tamperedSignature = `${originalSignature[0] === '0' ? '1' : '0'}${originalSignature.slice(1)}`;
      expect(() =>
        service.getVerifiedLocalPath(
          params.get('key')!,
          params.get('expires')!,
          tamperedSignature,
        ),
      ).toThrow(ForbiddenException);

      await service.delete(key);
      expect(() =>
        service.getVerifiedLocalPath(
          params.get('key')!,
          params.get('expires')!,
          params.get('signature')!,
        ),
      ).toThrow(NotFoundException);
    } finally {
      // Keep runtime upload state clean even when an assertion fails midway.
      await service.delete(key);
    }
  });

  it('rejects expired links and path traversal', async () => {
    const service = createService();
    expect(() =>
      service.getVerifiedLocalPath('missing.pdf', '1', 'invalid'),
    ).toThrow(ForbiddenException);
    await expect(
      service.upload('../outside.pdf', Buffer.from('x'), 'application/pdf'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
