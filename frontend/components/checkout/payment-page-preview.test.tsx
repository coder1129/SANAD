import { render, screen } from '@/test/render';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PaymentPagePreview } from './payment-page-preview';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn() }),
}));

describe('PaymentPagePreview', () => {
  it('shows the order details and switches between card and Apple Pay', async () => {
    const user = userEvent.setup();

    render(
      <PaymentPagePreview
        amount={719.1}
        orderId="123"
        transactionId="txn_preview_123"
      />,
    );

    expect(screen.getByText('#123')).toBeVisible();
    expect(screen.getByText('txn_preview_123')).toBeVisible();
    expect(screen.getByTestId('card-preview')).toBeVisible();

    await user.click(
      screen.getByRole('button', { name: /Apple Pay.*Fast checkout/i }),
    );

    expect(screen.getByTestId('apple-pay-preview')).toBeVisible();

    await user.click(screen.getByRole('button', { name: /Apple Pay ·/i }));

    expect(screen.getByText('Preview only')).toBeVisible();
    expect(
      screen.getByText(/No card data was sent and no payment was collected/i),
    ).toBeVisible();
  });
});
