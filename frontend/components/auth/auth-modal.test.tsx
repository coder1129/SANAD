import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AuthModalTrigger } from './auth-modal-trigger';
import { AuthModalProvider } from './auth-modal';

vi.mock('./sign-in-flow', () => ({
  SignInFlow: () => <input aria-label="Email address" />,
}));

describe('AuthModalProvider', () => {
  it('traps focus, closes on Escape and restores focus to its trigger', async () => {
    const user = userEvent.setup();
    render(
      <AuthModalProvider>
        <AuthModalTrigger>Sign In</AuthModalTrigger>
      </AuthModalProvider>,
    );

    const trigger = screen.getByRole('button', { name: 'Sign In' });
    await user.click(trigger);

    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.getByLabelText('Email address')).toHaveFocus();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
