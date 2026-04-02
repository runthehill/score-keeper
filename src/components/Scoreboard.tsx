import type { Game, GameEvent, Team } from '../types';
import { getSportConfig } from '../sports/configs';
import { formatGaelicScore } from '../utils/format';

interface Props {
  game: Game;
  events: GameEvent[];
}

export default function Scoreboard({ game, events }: Props) {
  const sport = getSportConfig(game.sport);
  const isSplit = sport.scoreDisplay === 'split';

  const renderScore = (score: number, team: Team) => {
    if (isSplit) {
      return (
        <div>
          <div className="text-4xl font-extrabold font-score tabular-nums">
            {formatGaelicScore(events, team)}
          </div>
          <div className="text-xs text-gray-500">({score})</div>
        </div>
      );
    }
    return <div className="text-5xl font-extrabold font-score tabular-nums">{score}</div>;
  };

  return (
    <div className="bg-surface-800 rounded-xl p-4 text-center">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs text-home uppercase tracking-widest font-semibold">Home</p>
          <p className="text-sm font-semibold mt-0.5 truncate">{game.home_team}</p>
          <div className="text-home mt-1">{renderScore(game.home_score, 'home')}</div>
        </div>
        <div className="text-sm text-gray-600 font-semibold px-3">VS</div>
        <div className="flex-1">
          <p className="text-xs text-away uppercase tracking-widest font-semibold">Away</p>
          <p className="text-sm font-semibold mt-0.5 truncate">{game.away_team}</p>
          <div className="text-away mt-1">{renderScore(game.away_score, 'away')}</div>
        </div>
      </div>
    </div>
  );
}
