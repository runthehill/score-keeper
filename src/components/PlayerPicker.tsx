import type { Player } from '../types';

interface Props {
  players: Player[];
  title: string;
  onSelect: (playerId: string) => void;
  onSkip: () => void;
  onClose: () => void;
}

export default function PlayerPicker({ players, title, onSelect, onSkip, onClose }: Props) {
  const activePlayers = players.filter((p) => p.status === 'active');

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full bg-surface rounded-t-2xl border-t border-line p-4 max-h-[60vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-bold text-txt mb-3">{title}</p>
        <div className="space-y-2">
          {activePlayers.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              className="w-full bg-surface-2 border border-line rounded-xl px-4 py-3 text-left flex items-center gap-3 press"
            >
              {p.number != null && <span className="text-sm text-txt-3 font-mono w-8">#{p.number}</span>}
              <span className="font-medium text-txt">{p.name}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="w-full mt-3 py-3 text-center text-sm text-txt-3 border border-line rounded-xl press"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
