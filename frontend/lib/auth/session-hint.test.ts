import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearSessionHint,
  hasSessionHint,
  setSessionHint,
} from './session-hint';

describe('session hint', () => {
  beforeEach(() => window.localStorage.clear());

  it('stores no credential data', () => {
    expect(hasSessionHint()).toBe(false);

    setSessionHint();

    expect(hasSessionHint()).toBe(true);
    expect(Object.values(window.localStorage)).toEqual(['1']);
  });

  it('can be cleared when the backend session ends', () => {
    setSessionHint();
    clearSessionHint();

    expect(hasSessionHint()).toBe(false);
  });
});
