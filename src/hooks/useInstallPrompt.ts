import { useSyncExternalStore } from 'react';
import {
  subscribeInstall,
  getInstallSnapshot,
  promptInstall,
  resolveInstallMode,
  isStandalone,
  isIOS,
  type InstallMode,
} from '../utils/installPrompt';

export function useInstallPrompt(): {
  mode: InstallMode;
  promptInstall: typeof promptInstall;
} {
  const snapshot = useSyncExternalStore(subscribeInstall, getInstallSnapshot, getInstallSnapshot);
  const mode = resolveInstallMode({
    hasPrompt: snapshot.hasPrompt && !snapshot.installed,
    isStandalone: isStandalone(),
    isIOS: isIOS(),
  });
  return { mode, promptInstall };
}
