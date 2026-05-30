import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  resolveInstallMode,
  isBannerDismissed,
  dismissBanner,
  promptInstall,
  isIOS,
} from './installPrompt';

describe('resolveInstallMode', () => {
  it('is hidden when running standalone (even if installable)', () => {
    expect(resolveInstallMode({ hasPrompt: true, isStandalone: true, isIOS: true })).toBe('hidden');
  });
  it('is installable when a native prompt is available', () => {
    expect(resolveInstallMode({ hasPrompt: true, isStandalone: false, isIOS: false })).toBe('installable');
  });
  it('is ios when there is no prompt but the device is iOS', () => {
    expect(resolveInstallMode({ hasPrompt: false, isStandalone: false, isIOS: true })).toBe('ios');
  });
  it('is hidden when nothing applies', () => {
    expect(resolveInstallMode({ hasPrompt: false, isStandalone: false, isIOS: false })).toBe('hidden');
  });
});

describe('banner dismissal', () => {
  beforeEach(() => localStorage.clear());
  it('persists dismissal to localStorage', () => {
    expect(isBannerDismissed()).toBe(false);
    dismissBanner();
    expect(isBannerDismissed()).toBe(true);
  });
});

// These run in order — the module holds a single captured prompt.
describe('promptInstall', () => {
  function dispatchBeforeInstallPrompt(outcome: 'accepted' | 'dismissed') {
    const evt = Object.assign(new Event('beforeinstallprompt'), {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome }),
    });
    window.dispatchEvent(evt);
    return evt;
  }

  it('returns "unavailable" when no prompt has been captured', async () => {
    expect(await promptInstall()).toBe('unavailable');
  });
  it('fires the native prompt and returns "accepted"', async () => {
    const evt = dispatchBeforeInstallPrompt('accepted');
    const outcome = await promptInstall();
    expect(evt.prompt).toHaveBeenCalledOnce();
    expect(outcome).toBe('accepted');
  });
  it('returns "dismissed" when the user declines', async () => {
    dispatchBeforeInstallPrompt('dismissed');
    expect(await promptInstall()).toBe('dismissed');
  });
});

describe('isIOS', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('detects iPhone', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari', maxTouchPoints: 5 });
    expect(isIOS()).toBe(true);
  });
  it('detects iPadOS reporting as Macintosh (touch)', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari', maxTouchPoints: 5 });
    expect(isIOS()).toBe(true);
  });
  it('is false on a real desktop Mac (no touch)', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari', maxTouchPoints: 0 });
    expect(isIOS()).toBe(false);
  });
});
