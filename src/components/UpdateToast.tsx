// Discriminated union: the update variant requires onReload; offline-ready has none.
type UpdateToastProps =
  | { kind: 'update'; onReload: () => void; onDismiss: () => void }
  | { kind: 'offline-ready'; onReload?: undefined; onDismiss: () => void };

export default function UpdateToast({ kind, onReload, onDismiss }: UpdateToastProps) {
  const isUpdate = kind === 'update';
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 z-[60] px-4 flex justify-center pointer-events-none"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 84px)' }}
    >
      <div className="pointer-events-auto w-full max-w-md bg-surface border border-line rounded-2xl p-3.5 flex items-center gap-3 shadow-lg">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-txt">
            {isUpdate ? '✨ New version available' : '✅ Ready to work offline'}
          </p>
          {isUpdate && <p className="text-xs text-txt-3 mt-0.5">Reload to get the latest.</p>}
        </div>
        {isUpdate && (
          <button
            type="button"
            onClick={onReload}
            className="flex-shrink-0 bg-txt text-bg text-sm font-bold rounded-xl px-4 py-2 press"
          >
            Reload
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 text-txt-3 text-lg leading-none px-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
