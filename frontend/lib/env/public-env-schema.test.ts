import { describe, expect, it } from 'vitest';

import { validatePublicEnvironment } from './public-env-schema';

const validEnvironment = {
  NEXT_PUBLIC_API_BASE_URL: 'https://api.sanad.example/api/v1/',
  NEXT_PUBLIC_MEDIA_BASE_URL: 'https://media.sanad.example/',
  NEXT_PUBLIC_SITE_URL: 'https://sanad.example/',
  NEXT_PUBLIC_CHECKOUT_MODE: 'manual',
};

describe('validatePublicEnvironment', () => {
  it('normalizes configured public URLs', () => {
    expect(
      validatePublicEnvironment(validEnvironment, { requireAll: true }),
    ).toEqual({
      apiBaseUrl: 'https://api.sanad.example/api/v1',
      checkoutMode: 'manual',
      mediaBaseUrl: 'https://media.sanad.example',
      siteUrl: 'https://sanad.example',
    });
  });

  it('rejects missing production variables', () => {
    expect(() => validatePublicEnvironment({}, { requireAll: true })).toThrow(
      /NEXT_PUBLIC_API_BASE_URL/,
    );
  });

  it('rejects insecure non-local origins', () => {
    expect(() =>
      validatePublicEnvironment(
        { ...validEnvironment, NEXT_PUBLIC_SITE_URL: 'http://sanad.example' },
        { requireAll: true },
      ),
    ).toThrow(/https/);
  });

  it('allows http for local development', () => {
    expect(
      validatePublicEnvironment(
        {
          NEXT_PUBLIC_API_BASE_URL: 'http://localhost:3001/api/v1',
          NEXT_PUBLIC_MEDIA_BASE_URL: 'http://localhost:3001/media',
          NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
          NEXT_PUBLIC_CHECKOUT_MODE: 'manual',
        },
        { requireAll: true },
      ).siteUrl,
    ).toBe('http://localhost:3000');
  });

  it('rejects an unsupported checkout mode', () => {
    expect(() =>
      validatePublicEnvironment(
        { ...validEnvironment, NEXT_PUBLIC_CHECKOUT_MODE: 'bypass' },
        { requireAll: true },
      ),
    ).toThrow(/CHECKOUT_MODE/);
  });

  it('accepts a Google web client ID and rejects malformed values', () => {
    expect(
      validatePublicEnvironment(
        {
          ...validEnvironment,
          NEXT_PUBLIC_GOOGLE_CLIENT_ID:
            '123456789-example.apps.googleusercontent.com',
        },
        { requireAll: true },
      ).googleClientId,
    ).toBe('123456789-example.apps.googleusercontent.com');

    expect(() =>
      validatePublicEnvironment(
        {
          ...validEnvironment,
          NEXT_PUBLIC_GOOGLE_CLIENT_ID: 'not-a-google-client-id',
        },
        { requireAll: true },
      ),
    ).toThrow(/GOOGLE_CLIENT_ID/);
  });
});
