import { describe, expect, it } from 'vitest';

import { validatePublicEnvironment } from './public-env-schema';

const validEnvironment = {
  NEXT_PUBLIC_API_BASE_URL: 'https://api.sanad.example/api/v1/',
  NEXT_PUBLIC_MEDIA_BASE_URL: 'https://media.sanad.example/',
  NEXT_PUBLIC_SITE_URL: 'https://sanad.example/',
};

describe('validatePublicEnvironment', () => {
  it('normalizes configured public URLs', () => {
    expect(
      validatePublicEnvironment(validEnvironment, { requireAll: true }),
    ).toEqual({
      apiBaseUrl: 'https://api.sanad.example/api/v1',
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
        },
        { requireAll: true },
      ).siteUrl,
    ).toBe('http://localhost:3000');
  });
});
