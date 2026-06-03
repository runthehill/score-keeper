import { useState } from 'react';

interface Props {
  initialSeconds: number;
  onSet: (seconds: number) => void;
  onClose: () => void;
}

export default function ClockEditModal({ initialSeconds, onSet, onClose }: Props) {
  const [mins, setMins] = useState(String(Math.floor(initialSeconds / 60)));
  const [secs, setSecs] = useState(String(initialSeconds % 60));

  const handleSet = () => {
    const m = Math.max(0, Math.floor(Number(mins) || 0));
    const s = Math.min(59, Math.max(0, Math.floor(Number(secs) || 0)));
    onSet(m * 60 + s);
    onClose();
  };

  const field = 'w-20 bg-surface-2 border border-line rounded-xl px-3 py-3 text-txt text-center text-2xl font-score tabular-nums focus:outline-none focus:border-txt-3';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative bg-surface rounded-2xl border border-line p-6 mx-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-extrabold mb-4 text-txt">Set the clock</h3>
        <div className="flex items-center justify-center gap-3 mb-5">
          <label className="flex flex-col items-center gap-1 text-[11px] font-bold uppercase tracking-[0.06em] text-txt-3">
            Minutes
            <input aria-label="Minutes" type="number" inputMode="numeric" min={0} value={mins} onChange={(e) => setMins(e.target.value)} className={field} />
          </label>
          <span className="text-2xl font-score text-txt-3 pt-5">:</span>
          <label className="flex flex-col items-center gap-1 text-[11px] font-bold uppercase tracking-[0.06em] text-txt-3">
            Seconds
            <input aria-label="Seconds" type="number" inputMode="numeric" min={0} max={59} value={secs} onChange={(e) => setSecs(e.target.value)} className={field} />
          </label>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-3 border border-line rounded-xl text-sm font-medium text-txt-2 press">Cancel</button>
          <button type="button" onClick={handleSet} className="flex-1 py-3 bg-txt text-bg rounded-xl text-sm font-bold press">Set</button>
        </div>
      </div>
    </div>
  );
}
