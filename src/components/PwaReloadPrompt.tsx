import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import UpdateToast from './UpdateToast';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // hourly
const OFFLINE_READY_TIMEOUT_MS = 5000;

export default function PwaReloadPrompt() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swScriptUrl, r) {
      setRegistration(r);
    },
  });

  // A HashRouter SPA never re-checks the service worker on in-app navigation, so
  // poll for a new build hourly and whenever the app returns to the foreground.
  useEffect(() => {
    if (!registration) return;
    const check = () => { void registration.update().catch(() => {}); };
    const interval = setInterval(check, UPDATE_CHECK_INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [registration]);

  // The offline-ready notice is purely informational — auto-dismiss it.
  useEffect(() => {
    if (!offlineReady) return;
    const t = setTimeout(() => setOfflineReady(false), OFFLINE_READY_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [offlineReady, setOfflineReady]);

  if (needRefresh) {
    return (
      <UpdateToast
        kind="update"
        onReload={() => { void updateServiceWorker(true); }}
        onDismiss={() => setNeedRefresh(false)}
      />
    );
  }
  if (offlineReady) {
    return <UpdateToast kind="offline-ready" onDismiss={() => setOfflineReady(false)} />;
  }
  return null;
}
