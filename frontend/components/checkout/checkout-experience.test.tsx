import { render, screen } from '@/test/render';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UseAuthResult } from '@/hooks/use-auth';
import type { CareerPackage, CheckoutPricing, User } from '@/types/domain';

import { CheckoutExperience } from './checkout-experience';

const mocks = vi.hoisted(() => ({
  auth: null as UseAuthResult | null,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/checkout/professional-cv',
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock('@/components/auth/auth-modal', () => ({
  useAuthModal: () => vi.fn(),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mocks.auth,
}));

vi.mock('@/lib/api', () => ({
  checkoutApi: { preview: vi.fn() },
  isApiError: () => false,
  ordersApi: { create: vi.fn() },
  packagesApi: { list: vi.fn() },
  paymentsApi: { create: vi.fn() },
}));

const packageItem: CareerPackage = {
  id: 1,
  name: 'Professional CV',
  description: null,
  price: 400,
  features: [],
  deliveryDays: 3,
  maxRevisions: 2,
  sortOrder: 1,
  images: [],
  offers: [],
  buyerCount: 0,
  ratingAverage: null,
  ratingCount: 0,
};

const pricing: CheckoutPricing = {
  packageId: 1,
  packageName: 'Professional CV',
  deliveryDays: 3,
  originalPrice: 400,
  secondaryPackageId: null,
  secondaryPackageName: null,
  secondaryOriginalPrice: 0,
  secondaryDiscountAmount: 0,
  offerId: null,
  offerDiscountPercentage: 0,
  offerDiscountAmount: 0,
  couponCode: null,
  couponDiscountAmount: 0,
  subtotalAfterDiscounts: 400,
  totalAmount: 400,
  finalAmount: 400,
  currency: 'AED',
};

const user: User = {
  id: 7,
  name: 'Sanad Customer',
  email: 'customer@example.com',
  phone: '+971 50 123 4567',
  role: 'customer',
  emailVerified: true,
  lastLoginAt: null,
  createdAt: null,
  updatedAt: null,
};

function authState(overrides: Partial<UseAuthResult> = {}): UseAuthResult {
  return {
    user: null,
    status: 'initializing',
    isAuthenticated: false,
    isInitializing: true,
    isAnonymous: false,
    isAdmin: false,
    hasRole: () => false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    changePassword: vi.fn(),
    ...overrides,
  };
}

describe('CheckoutExperience', () => {
  beforeEach(() => {
    mocks.auth = authState();
  });

  it('copies the restored account phone into the WhatsApp field', async () => {
    const view = render(
      <CheckoutExperience packageItem={packageItem} pricing={pricing} />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Restoring your secure session...',
    );

    mocks.auth = authState({
      user,
      status: 'authenticated',
      isAuthenticated: true,
      isInitializing: false,
    });
    view.rerender(
      <CheckoutExperience packageItem={packageItem} pricing={pricing} />,
    );

    const phone = await screen.findByLabelText(/WhatsApp phone/);
    expect(phone).toHaveValue('+971 50 123 4567');

    await userEvent.clear(phone);
    expect(phone).toHaveValue('');
  });
});
