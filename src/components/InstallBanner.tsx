import { useState } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { isBannerDismissed, dismissBanner } from '../utils/installPrompt';
import IosInstallSheet from './IosInstallSheet';

export default function InstallBanner() {
  const { mode, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(isBannerDismissed);
  const [showIos, setShowIos] = useState(false);

  if (mode === 'hidden' || dismissed) return null;

  const handleInstall = () => {
    if (mode === 'ios') setShowIos(true);
    // Fire-and-forget: swallow rejection (e.g. prompt already consumed) so it
    // doesn't surface as an unhandled promise rejection.
    else void promptInstall().catch(() => {});
  };

  const handleDismiss = () => {
    dismissBanner();
    setDismissed(true);
  };

  return (
    <>
      <div className="bg-surface border border-line rounded-2xl p-4 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-txt">📲 Install Score Keeper</p>
          <p className="text-xs text-txt-3 mt-0.5">Add it to your home screen for one-tap, offline access.</p>
        </div>
        <button
          type="button"
          onClick={handleInstall}
          className="flex-shrink-0 bg-txt text-bg text-sm font-bold rounded-xl px-4 py-2 press"
        >
          Install
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 text-txt-3 text-lg leading-none px-1"
        >
          ✕
        </button>
      </div>
      {showIos && <IosInstallSheet onClose={() => setShowIos(false)} />}
    </>
  );
}
