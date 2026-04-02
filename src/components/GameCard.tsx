import { Link } from 'react-router-dom';
import type { Game } from '../types';
import { getSportConfig } from '../sports/configs';

interface Props {
  game: Game;
}

export default function GameCard({ game }: Props) {
  const sport = getSportConfig(game.sport);
  const isLive = game.status === 'in_progress';
  const linkTo = isLive ? `/game/${game.id}` : `/summary/${game.id}`;

  return (
    <Link
      to={linkTo}
      className={`block bg-surface-800 rounded-xl p-4 transition-colors active:bg-surface-700 ${
        isLive ? 'border border-accent/50' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm">
          {sport.icon} {sport.name}
        </span>
        {isLive && (
          <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-semibold">
            LIVE
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-semibold text-home">{game.home_team}</p>
          <p className="font-semibold text-away">{game.away_team}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-xl text-home">{game.home_score}</p>
          <p className="font-bold text-xl text-away">{game.away_score}</p>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        {new Date(game.started_at).toLocaleDateString()}
      </p>
    </Link>
  );
}
