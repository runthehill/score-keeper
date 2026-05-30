export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallMode = 'installable' | 'ios' | 'hidden';
export interface InstallSnapshot {
  hasPrompt: boolean;
  installed: boolean;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let snapshot: InstallSnapshot = { hasPrompt: false, installed: false };
const listeners = new Set<() => void>();

function update(next: InstallSnapshot): void {
  snapshot = next;
  listeners.forEach((l) => l());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    update({ hasPrompt: true, installed: snapshot.installed });
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    update({ hasPrompt: false, installed: true });
  });
}

export function subscribeInstall(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getInstallSnapshot(): InstallSnapshot {
  return snapshot;
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';
  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  update({ hasPrompt: false, installed: snapshot.installed });
  return outcome;
}

export function resolveInstallMode(s: { hasPrompt: boolean; isStandalone: boolean; isIOS: boolean }): InstallMode {
  if (s.isStandalone) return 'hidden';
  if (s.hasPrompt) return 'installable';
  if (s.isIOS) return 'ios';
  return 'hidden';
}

export function isStandalone(): boolean {
  const mql = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(display-mode: standalone)').matches
    : false;
  const iosStandalone = typeof navigator !== 'undefined' && (navigator as { standalone?: boolean }).standalone === true;
  return mql || iosStandalone;
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ Safari reports as "Macintosh"; distinguish it from a real Mac by touch support.
  const iPadOnMac = /macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
  return /iphone|ipad|ipod/i.test(ua) || iPadOnMac;
}

const DISMISS_KEY = 'sk-install-dismissed';
export function isBannerDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}
export function dismissBanner(): void {
  try {
    localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    // localStorage unavailable (private mode) — non-critical
  }
}
