import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CmsRichText, sanitizeCmsContent } from './cms-rich-text';

describe('CmsRichText', () => {
  it('renders sanitized content synchronously', () => {
    render(
      <CmsRichText content="<h2>About SANAD</h2><p>Trusted content.</p>" />,
    );

    expect(screen.getByRole('heading', { name: 'About SANAD' })).toBeVisible();
    expect(screen.getByText('Trusted content.')).toBeVisible();
  });

  it('removes scripts, event handlers and unsafe link schemes', () => {
    const result = sanitizeCmsContent(
      '<script>alert(1)</script><a href="javascript:alert(2)" onclick="alert(3)">Open</a>',
    );

    expect(result).not.toContain('<script');
    expect(result).not.toContain('javascript:');
    expect(result).not.toContain('onclick');
    expect(result).toContain('rel="noopener noreferrer"');
  });

  it('hardens external links', () => {
    render(
      <CmsRichText content='<a href="https://example.com">External</a>' />,
    );

    expect(screen.getByRole('link', { name: 'External' })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
    expect(screen.getByRole('link', { name: 'External' })).toHaveAttribute(
      'target',
      '_blank',
    );
  });
});
