import { cleanup, render, screen, within } from '@/test/render';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CareerPackage } from '@/types/domain';
import { ServicesCatalog } from './services-catalog';
import { PackageComparison } from './package-comparison';
import { PackageGallery } from './package-gallery';

vi.mock('next/navigation', async () => {
  const { useSyncExternalStore } = await import('react');
  return {
    useSearchParams: () =>
      new URLSearchParams(
        useSyncExternalStore(
          (listener) => {
            window.addEventListener('popstate', listener);
            return () => window.removeEventListener('popstate', listener);
          },
          () => window.location.search,
          () => '',
        ),
      ),
  };
});

function service(
  id: number,
  name: string,
  price: number,
  features: string[],
): CareerPackage {
  return {
    id,
    name,
    price,
    features,
    description: 'Support for your next job and professional profile.',
    deliveryDays: 5,
    maxRevisions: id,
    sortOrder: id,
    images: [],
    offers: [],
    buyerCount: 0,
    ratingAverage: null,
    ratingCount: 0,
  };
}
const packages = [
  service(1, 'Professional Package', 250, ['Professional CV', 'Cover Letter']),
  service(2, 'Full Package', 650, [
    'Professional CV',
    'Cover Letter',
    'LinkedIn Profile Optimization',
  ]),
  service(4, 'Professional CV', 199, ['Professional CV']),
  service(5, 'LinkedIn Profile Optimization', 149, ['Headline', 'About']),
];

beforeEach(() => {
  window.history.replaceState(null, '', '/packages');
  const replace = window.history.replaceState.bind(window.history);
  vi.spyOn(window.history, 'replaceState').mockImplementation(
    (data, unused, url) => {
      replace(data, unused, url);
      window.dispatchEvent(new PopStateEvent('popstate'));
    },
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Package selection experience', () => {
  it('restores a shared filter URL and keeps complete packages together despite profile keywords', () => {
    window.history.replaceState(
      null,
      '',
      '/packages?category=bundles&sort=price-descending',
    );
    render(<ServicesCatalog packages={packages} />);
    expect(
      screen.getByRole('button', { name: 'Complete packages' }),
    ).toHaveAttribute('aria-pressed', 'true');
    const cards = screen.getAllByRole('heading', { level: 3 });
    expect(cards.map((card) => card.textContent)).toEqual([
      'Full Package',
      'Professional Package',
    ]);
  });

  it('updates shareable filters, announces empty results and resets without deleting unrelated URL data', async () => {
    const user = userEvent.setup();
    window.history.replaceState(
      null,
      '',
      '/packages?source=manual#services-catalog',
    );
    render(<ServicesCatalog packages={packages} />);
    await user.click(screen.getByRole('button', { name: 'LinkedIn' }));
    expect(new URLSearchParams(window.location.search).get('category')).toBe(
      'profile',
    );
    expect(screen.getByRole('status')).toHaveTextContent('Showing 1 of 4');
    await user.type(screen.getByRole('searchbox'), 'unavailable');
    expect(
      screen.getByRole('heading', { name: 'No services match those filters.' }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Show all services' }));
    expect(window.location.search).toBe('?source=manual');
    expect(window.location.hash).toBe('#services-catalog');
    expect(screen.getByRole('status')).toHaveTextContent('Showing 4 of 4');
  });

  it('compares published scope and different revision allowances without inventing inclusions', () => {
    render(<PackageComparison packages={packages} />);
    const table = screen.getByRole('table');
    const row = within(table).getByRole('row', {
      name: /LinkedIn Profile Optimization/,
    });
    expect(within(row).getByText('Not listed')).toBeInTheDocument();
    expect(within(row).getByText('Included')).toBeInTheDocument();
    expect(
      within(table).getByRole('row', { name: /Revision rounds/ }),
    ).toHaveTextContent('1');
    expect(
      screen.queryByRole('link', { name: 'Professional CV' }),
    ).not.toBeInTheDocument();
  });

  it('opens a service illustration and restores keyboard focus after Escape', async () => {
    const user = userEvent.setup();
    render(
      <PackageGallery
        packageName="Professional CV"
        images={[
          {
            id: 1,
            path: '/images/packages/professional-cv.png',
            altText: 'CV illustration',
            isPrimary: true,
            displayOrder: 0,
          },
        ]}
      />,
    );
    const trigger = screen.getByRole('button', {
      name: 'Enlarge Professional CV illustration',
    });
    await user.click(trigger);
    expect(screen.getByRole('dialog')).toBeVisible();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
