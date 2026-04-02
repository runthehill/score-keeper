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
        className="relative w-full bg-surface-800 rounded-t-2xl p-4 max-h-[60vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-semibold text-gray-400 mb-3">{title}</p>
        <div className="space-y-2">
          {activePlayers.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="w-full bg-surface-700 rounded-lg px-4 py-3 text-left flex items-center gap-3 active:bg-surface-600"
            >
              {p.number != null && (
                <span className="text-sm text-gray-400 font-mono w-8">#{p.number}</span>
              )}
              <span className="font-medium">{p.name}</span>
            </button>
          ))}
        </div>
        <button
          onClick={onSkip}
          className="w-full mt-3 py-3 text-center text-sm text-gray-500 border border-surface-600 rounded-lg"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
