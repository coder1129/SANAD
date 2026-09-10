import { cleanup, render, screen, waitFor } from '@/test/render';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { UseAuthResult } from '@/hooks/use-auth';
import type { CareerPackage, CheckoutPricing, User } from '@/types/domain';

import { CheckoutExperience } from './checkout-experience';

const mocks = vi.hoisted(() => ({
  auth: null as UseAuthResult | null,
  checkoutPreview: vi.fn(),
  orderCreate: vi.fn(),
  packagesList: vi.fn(),
  paymentCreate: vi.fn(),
  profileGet: vi.fn(),
  routerReplace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/checkout/professional-cv',
  useRouter: () => ({ replace: mocks.routerReplace }),
}));

vi.mock('@/components/auth/auth-modal', () => ({
  useAuthModal: () => vi.fn(),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mocks.auth,
}));

vi.mock('@/lib/api', () => ({
  checkoutApi: { preview: mocks.checkoutPreview },
  isApiError: (error: unknown) =>
    typeof error === 'object' && error !== null && 'code' in error,
  ordersApi: { create: mocks.orderCreate },
  packagesApi: { list: mocks.packagesList },
  paymentsApi: { create: mocks.paymentCreate },
  profileApi: { get: mocks.profileGet },
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
    vi.clearAllMocks();
    mocks.auth = authState();
    mocks.checkoutPreview.mockResolvedValue(pricing);
    mocks.packagesList.mockResolvedValue({ items: [], meta: {} });
    mocks.profileGet.mockResolvedValue(user);
  });

  afterEach(() => cleanup());

  it('does not display a customer-data form before submitting the order', async () => {
    const view = render(
      <CheckoutExperience
        checkoutMode="manual"
        packageItem={packageItem}
        pricing={pricing}
      />,
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
      <CheckoutExperience
        checkoutMode="manual"
        packageItem={packageItem}
        pricing={pricing}
      />,
    );

    expect(screen.queryByLabelText(/WhatsApp phone/)).not.toBeVisible();
    expect(screen.queryByLabelText('Target job title')).not.toBeVisible();
    expect(screen.getByLabelText('Coupon Code')).toBeVisible();
  });

  it('hides online payment methods in manual checkout mode', () => {
    mocks.auth = authState({
      user,
      status: 'authenticated',
      isAuthenticated: true,
      isInitializing: false,
    });

    render(
      <CheckoutExperience
        checkoutMode="manual"
        packageItem={packageItem}
        pricing={pricing}
      />,
    );

    expect(
      screen.getAllByText('Payment arranged on WhatsApp').length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('button', { name: /Submit request/ }).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText('Visa or Mastercard')).not.toBeInTheDocument();
    expect(screen.queryByText('Apple Pay')).not.toBeInTheDocument();
  });

  it('keeps the preserved card and Apple Pay controls in gateway mode', () => {
    mocks.auth = authState({
      user,
      status: 'authenticated',
      isAuthenticated: true,
      isInitializing: false,
    });

    render(
      <CheckoutExperience
        checkoutMode="gateway"
        packageItem={packageItem}
        pricing={pricing}
      />,
    );

    expect(screen.getByText('Visa or Mastercard')).toBeVisible();
    expect(screen.getByText('Apple Pay')).toBeVisible();
    expect(
      screen.getByRole('button', { name: /Continue to payment/ }),
    ).toBeVisible();
  });

  it('requires a coupon code before sending a preview request', async () => {
    mocks.auth = authState({
      user,
      status: 'authenticated',
      isAuthenticated: true,
      isInitializing: false,
    });
    const interaction = userEvent.setup();

    render(
      <CheckoutExperience
        checkoutMode="manual"
        packageItem={packageItem}
        pricing={pricing}
      />,
    );
    await interaction.click(screen.getByRole('button', { name: 'Apply' }));

    expect(
      screen.getByText('Enter a coupon code before applying it.'),
    ).toBeVisible();
    expect(mocks.checkoutPreview).not.toHaveBeenCalled();
  });

  it('shows a coupon-specific validation message returned by the API', async () => {
    mocks.auth = authState({
      user,
      status: 'authenticated',
      isAuthenticated: true,
      isInitializing: false,
    });
    mocks.checkoutPreview.mockRejectedValue({ code: 'COUPON_EXPIRED' });
    const interaction = userEvent.setup();

    render(
      <CheckoutExperience
        checkoutMode="manual"
        packageItem={packageItem}
        pricing={pricing}
      />,
    );
    await interaction.type(screen.getByLabelText('Coupon Code'), 'EXPIRED');
    await interaction.click(screen.getByRole('button', { name: 'Apply' }));

    expect(await screen.findByText('This coupon has expired.')).toBeVisible();
    expect(screen.getByLabelText('Coupon Code')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('submits a manual request without creating an online payment session', async () => {
    mocks.auth = authState({
      user,
      status: 'authenticated',
      isAuthenticated: true,
      isInitializing: false,
    });
    mocks.orderCreate.mockResolvedValue({
      id: 19,
      orderNumber: 'SANAD-2026-MANUAL',
    });
    const interaction = userEvent.setup();

    render(
      <CheckoutExperience
        checkoutMode="manual"
        packageItem={packageItem}
        pricing={pricing}
      />,
    );
    await interaction.click(
      screen.getByRole('button', { name: /Submit request/ }),
    );

    await waitFor(() => {
      expect(mocks.orderCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          packageId: 1,
          customerPhone: '+971 50 123 4567',
        }),
      );
      expect(mocks.routerReplace).toHaveBeenCalledWith(
        '/order-success/SANAD-2026-MANUAL',
      );
    });
    expect(mocks.paymentCreate).not.toHaveBeenCalled();
  });

  it('shows all specific second-service offers and submits the selected service', async () => {
    mocks.auth = authState({
      user,
      status: 'authenticated',
      isAuthenticated: true,
      isInitializing: false,
    });
    mocks.checkoutPreview.mockResolvedValue({
      ...pricing,
      originalPrice: 700,
      secondaryPackageId: 2,
      secondaryPackageName: 'LinkedIn Profile',
      secondaryOriginalPrice: 300,
      secondaryDiscountAmount: 60,
      offerId: 11,
      offerDiscountPercentage: 20,
      offerDiscountAmount: 60,
      subtotalAfterDiscounts: 640,
      totalAmount: 640,
      finalAmount: 640,
    });
    mocks.orderCreate.mockResolvedValue({
      id: 20,
      orderNumber: 'SANAD-2026-CROSS',
    });
    const interaction = userEvent.setup();
    const packageWithOffers: CareerPackage = {
      ...packageItem,
      companionOffers: [
        {
          id: 11,
          name: 'LinkedIn special',
          nameAr: 'عرض لينكدإن',
          description: null,
          discountPercentage: 20,
          type: 'cross_service_specific',
          packageId: 2,
          packageName: 'LinkedIn Profile',
          packageNameAr: 'الملف الشخصي على لينكدإن',
          packagePrice: 300,
        },
        {
          id: 12,
          name: 'Cover letter special',
          description: null,
          discountPercentage: 15,
          type: 'cross_service_specific',
          packageId: 3,
          packageName: 'Cover Letter',
          packagePrice: 200,
        },
      ],
    };

    render(
      <CheckoutExperience
        checkoutMode="manual"
        packageItem={packageWithOffers}
        pricing={pricing}
      />,
    );

    expect(screen.getByText('LinkedIn special')).toBeVisible();
    expect(screen.getByText('Cover letter special')).toBeVisible();
    await interaction.click(
      screen.getByRole('checkbox', { name: /LinkedIn special/ }),
    );

    await waitFor(() => {
      expect(mocks.checkoutPreview).toHaveBeenCalledWith(
        expect.objectContaining({ packageId: 1, secondaryPackageId: 2 }),
      );
      expect(
        screen.getByRole('button', { name: 'Remove second service' }),
      ).toBeVisible();
    });

    await interaction.click(
      screen.getByRole('button', { name: /Submit request/ }),
    );
    await waitFor(() => {
      expect(mocks.orderCreate).toHaveBeenCalledWith(
        expect.objectContaining({ packageId: 1, secondaryPackageId: 2 }),
      );
    });
  });
});
