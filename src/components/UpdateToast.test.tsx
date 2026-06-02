import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UpdateToast from './UpdateToast';

describe('UpdateToast', () => {
  it('update variant: shows the message, Reload fires onReload, ✕ fires onDismiss', async () => {
    const onReload = vi.fn();
    const onDismiss = vi.fn();
    render(<UpdateToast kind="update" onReload={onReload} onDismiss={onDismiss} />);

    expect(screen.getByText(/new version available/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /reload/i }));
    expect(onReload).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('offline-ready variant: shows the message, has NO Reload button, ✕ fires onDismiss', async () => {
    const onDismiss = vi.fn();
    render(<UpdateToast kind="offline-ready" onDismiss={onDismiss} />);

    expect(screen.getByText(/ready to work offline/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reload/i })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
