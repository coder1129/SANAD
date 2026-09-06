import { describe, expect, it } from 'vitest';

import { sanitizeRedirectPath, withNextParam } from './redirect';

describe('safe authentication redirects', () => {
  it.each([
    'https://evil.example',
    '//evil.example/path',
    '/\\evil.example/path',
    '/%2f%2fevil.example',
    'javascript:alert(1)',
  ])('rejects external target %s', (target) => {
    expect(sanitizeRedirectPath(target, '/my-orders')).toBe('/my-orders');
  });

  it('preserves a normalized internal target', () => {
    expect(sanitizeRedirectPath('/my-orders?status=new#top')).toBe(
      '/my-orders?status=new#top',
    );
  });

  it('encodes a safe next parameter', () => {
    expect(withNextParam('/sign-in', '/profile')).toBe(
      '/sign-in?next=%2Fprofile',
    );
  });
});
