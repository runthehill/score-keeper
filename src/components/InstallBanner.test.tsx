import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InstallBanner from './InstallBanner';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { isBannerDismissed, dismissBanner } from '../utils/installPrompt';

vi.mock('../hooks/useInstallPrompt', () => ({ useInstallPrompt: vi.fn() }));
const mockHook = vi.mocked(useInstallPrompt);

beforeEach(() => {
  localStorage.clear();
  mockHook.mockReset();
});

describe('InstallBanner', () => {
  it('renders nothing when mode is hidden', () => {
    mockHook.mockReturnValue({ mode: 'hidden', promptInstall: vi.fn() });
    const { container } = render(<InstallBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the banner and calls promptInstall on Install (installable)', async () => {
    const promptInstall = vi.fn().mockResolvedValue('accepted');
    mockHook.mockReturnValue({ mode: 'installable', promptInstall });
    render(<InstallBanner />);
    expect(screen.getByText('📲 Install Score Keeper')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Install' }));
    expect(promptInstall).toHaveBeenCalledOnce();
  });

  it('dismiss hides the banner and persists the choice', async () => {
    mockHook.mockReturnValue({ mode: 'installable', promptInstall: vi.fn() });
    const { container } = render(<InstallBanner />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(container).toBeEmptyDOMElement();
    expect(isBannerDismissed()).toBe(true);
  });

  it('does not render when already dismissed', () => {
    dismissBanner();
    mockHook.mockReturnValue({ mode: 'installable', promptInstall: vi.fn() });
    const { container } = render(<InstallBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('opens the iOS instructions on Install (ios mode)', async () => {
    mockHook.mockReturnValue({ mode: 'ios', promptInstall: vi.fn() });
    render(<InstallBanner />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Install' }));
    expect(screen.getByText('Add to Home Screen')).toBeInTheDocument();
  });
});
