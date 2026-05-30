import type { Game, GameEvent, Team } from '../types';
import { getSportConfig } from '../sports/configs';
import { formatGaelicScore } from '../utils/format';
import { inkOn } from '../utils/teamColors';

interface Props {
  game: Game;
  events: GameEvent[];
  flash?: Team | null;
}

export default function Scoreboard({ game, events, flash = null }: Props) {
  const sport = getSportConfig(game.sport);
  const isSplit = sport.scoreDisplay === 'split';

  const half = (side: Team) => {
    const isHome = side === 'home';
    const primary = isHome ? game.home_primary : game.away_primary;
    const secondary = isHome ? game.home_secondary : game.away_secondary;
    const name = isHome ? game.home_team : game.away_team;
    const score = isHome ? game.home_score : game.away_score;
    const ink = inkOn(primary);
    const scoreText = isSplit ? formatGaelicScore(events, side) : String(score);
    return (
      <div
        className="relative flex-1 min-w-0 flex flex-col px-4 pt-[18px] pb-5"
        style={{ background: primary, alignItems: isHome ? 'flex-start' : 'flex-end', textAlign: isHome ? 'left' : 'right' }}
      >
        <div className="absolute top-0 left-0 right-0 h-[5px]" style={{ background: secondary, opacity: 0.95 }} />
        <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] mb-0.5" style={{ color: ink, opacity: 0.92 }}>
          {isHome ? 'Home' : 'Away'}
        </span>
        <span className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[14.5px] font-bold -tracking-[0.01em]" style={{ color: ink }}>
          {name}
        </span>
        <span
          className={`font-score font-bold tabular-nums leading-[0.92] mt-1.5 ${flash === side ? 'score-pop' : ''} ${isSplit ? 'text-[56px]' : 'text-[76px] -tracking-[0.02em]'}`}
          style={{ color: ink }}
        >
          {scoreText}
        </span>
        {isSplit && (
          <span className="text-xs font-semibold" style={{ color: ink, opacity: 0.7 }}>
            {score} pts
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="relative flex rounded-[20px] overflow-hidden shadow-card">
      {half('home')}
      <div className="w-0 relative z-[2]">
        <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-full grid place-items-center bg-surface shadow-card text-[11px] font-extrabold text-txt-2 tracking-[0.02em]">
          VS
        </div>
      </div>
      {half('away')}
    </div>
  );
}
