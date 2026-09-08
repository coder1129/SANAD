import { describe, expect, it } from 'vitest';
import { unwrapEnvelope } from './envelope';
import { ApiError } from './errors';

describe('unwrapEnvelope', () => {
  it('unwraps a standard success envelope', () => {
    const payload = {
      success: true,
      data: { id: 1, name: 'Sanad Package' },
      message: null,
    };
    expect(unwrapEnvelope(payload, 200)).toEqual({
      id: 1,
      name: 'Sanad Package',
    });
  });

  it('unwraps a success envelope with null data', () => {
    const payload = {
      success: true,
      data: null,
      message: 'Package image deleted',
    };
    expect(unwrapEnvelope(payload, 200)).toBeNull();
  });

  it('tolerates a success envelope where data is omitted (e.g. action response)', () => {
    const payload = {
      success: true,
      message: 'Package image deleted',
    };
    expect(unwrapEnvelope(payload, 200)).toBeNull();
  });

  it('resolves empty body or 204 to null', () => {
    expect(unwrapEnvelope(null, 204)).toBeNull();
    expect(unwrapEnvelope(undefined, 204)).toBeNull();
    expect(unwrapEnvelope('', 200)).toBeNull();
  });

  it('throws ApiError on failure envelope', () => {
    const payload = {
      success: false,
      message: 'Image not found',
      code: 'NOT_FOUND',
    };
    expect(() => unwrapEnvelope(payload, 404)).toThrow(ApiError);
  });

  it('throws ApiError when 2xx response violates envelope format', () => {
    expect(() => unwrapEnvelope({ unknown_field: 123 }, 200)).toThrow(ApiError);
  });
});
