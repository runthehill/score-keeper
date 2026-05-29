import type { ScoringEventConfig } from '../types';

interface Props {
  event: ScoringEventConfig;
  team: 'home' | 'away';
  onClick: () => void;
}

export default function ScoreButton({ event, team, onClick }: Props) {
  const isHome = team === 'home';
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg py-3 px-2 text-center border transition-transform active:scale-95 ${
        isHome
          ? 'bg-home-dark border-home text-white'
          : 'bg-away-dark border-away text-white'
      }`}
    >
      <div className="text-sm font-bold">
        {event.color && (
          <span className="mr-1" style={{ color: event.color }} aria-hidden="true">
            ●
          </span>
        )}
        {event.label}
      </div>
      <div className={`text-xs ${isHome ? 'text-home' : 'text-away'}`}>+{event.points}</div>
    </button>
  );
}
