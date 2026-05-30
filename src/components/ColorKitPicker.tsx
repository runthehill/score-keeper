import { useState } from 'react';
import { KITS, SWATCHES } from '../sports/kits';
import { isPale, inkOn } from '../utils/teamColors';
import TeamKitChip from './TeamKitChip';
import { Check, Close } from './icons';

interface Kit {
  primary: string;
  secondary: string;
}

interface Props {
  team: string;
  value: Kit;
  onChange: (kit: Kit) => void;
  onClose: () => void;
}

function SwatchGrid({ value, onPick }: { value: string; onPick: (c: string) => void }) {
  return (
    <div className="grid grid-cols-9 gap-2">
      {SWATCHES.map((c) => {
        const active = value.toLowerCase() === c.toLowerCase();
        const pale = isPale(c);
        return (
          <button
            key={c}
            type="button"
            onClick={() => onPick(c)}
            aria-label={c}
            className="aspect-square rounded-md relative press"
            style={{
              background: c,
              boxShadow: active
                ? '0 0 0 2px var(--surface), 0 0 0 4px var(--txt)'
                : `inset 0 0 0 1px ${pale ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.12)'}`,
            }}
          >
            {active && (
              <span className="absolute inset-0 grid place-items-center" style={{ color: inkOn(c) }}>
                <Check size={15} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function ColorKitPicker({ team, value, onChange, onClose }: Props) {
  const [primary, setPrimary] = useState(value.primary);
  const [secondary, setSecondary] = useState(value.secondary);

  const commit = (p: string, s: string) => {
    setPrimary(p);
    setSecondary(s);
    onChange({ primary: p, secondary: s });
  };

  const eyebrow = 'text-[11px] font-extrabold uppercase tracking-[0.09em] text-txt-3 mb-2.5';

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full bg-surface rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto border-t border-line"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-extrabold text-txt">{team} kit</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-full bg-surface-2 border border-line text-txt-2">
            <Close size={16} />
          </button>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-2xl bg-surface-2 border border-line mb-5">
          <TeamKitChip primary={primary} secondary={secondary} size={46} radius={13} />
          <div className="flex-1 min-w-0">
            <div className="text-base font-extrabold text-txt truncate">{team}</div>
            <div className="text-xs text-txt-3 mt-0.5 tracking-wide">{primary.toUpperCase()} · {secondary.toUpperCase()}</div>
          </div>
          <div className="font-score font-bold text-3xl leading-none" style={{ color: primary }}>14</div>
        </div>

        <p className={eyebrow}>Quick kits</p>
        <div className="grid grid-cols-5 gap-2 mb-5">
          {KITS.map((k) => {
            const active = k.primary === primary && k.secondary === secondary;
            return (
              <button key={k.name} type="button" onClick={() => commit(k.primary, k.secondary)} className="flex flex-col items-center gap-1.5 press">
                <div className="rounded-xl p-0.5" style={{ boxShadow: active ? '0 0 0 2px var(--txt)' : 'none' }}>
                  <TeamKitChip primary={k.primary} secondary={k.secondary} size={40} radius={10} />
                </div>
                <span className={`text-[10.5px] font-semibold ${active ? 'text-txt' : 'text-txt-3'}`}>{k.name}</span>
              </button>
            );
          })}
        </div>

        <p className={eyebrow}>Primary</p>
        <div className="mb-5"><SwatchGrid value={primary} onPick={(c) => commit(c, secondary)} /></div>
        <p className={eyebrow}>Secondary</p>
        <div className="mb-6"><SwatchGrid value={secondary} onPick={(c) => commit(primary, c)} /></div>

        <button type="button" onClick={onClose} className="w-full py-4 rounded-xl bg-txt text-bg text-base font-bold">
          Done
        </button>
      </div>
    </div>
  );
}
