import { Link } from 'react-router-dom';
import type { Game, Team } from '../types';
import { getSportConfig } from '../sports/configs';
import { useThemeContext } from '../hooks/useTheme';
import { teamAccent } from '../utils/teamColors';
import { formatRelativeDay } from '../utils/format';
import TeamKitChip from './TeamKitChip';

interface Props {
  game: Game;
}

export default function GameCard({ game }: Props) {
  const sport = getSportConfig(game.sport);
  const { dark } = useThemeContext();
  const isLive = game.status === 'in_progress';
  const linkTo = isLive ? `/game/${game.id}` : `/summary/${game.id}`;
  const homeWin = game.home_score > game.away_score;
  const awayWin = game.away_score > game.home_score;

  const row = (team: Team) => {
    const isHome = team === 'home';
    const name = isHome ? game.home_team : game.away_team;
    const score = isHome ? game.home_score : game.away_score;
    const primary = isHome ? game.home_primary : game.away_primary;
    const secondary = isHome ? game.home_secondary : game.away_secondary;
    const win = isHome ? homeWin : awayWin;
    const accent = teamAccent({ primary, secondary }, dark);
    const scoreColor = isLive ? accent : win ? 'var(--txt)' : 'var(--txt-3)';
    return (
      <div className="flex items-center gap-2.5">
        <TeamKitChip primary={primary} secondary={secondary} size={20} radius={6} />
        <span className={`flex-1 min-w-0 truncate text-sm ${isLive || win ? 'font-extrabold text-txt' : 'font-semibold text-txt-2'}`}>{name}</span>
        <span className="font-score font-bold text-xl tabular-nums" style={{ color: scoreColor }}>{score}</span>
      </div>
    );
  };

  return (
    <Link to={linkTo} className="block bg-surface border border-line rounded-2xl p-3.5 press">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[15px]" aria-hidden="true">{sport.icon}</span>
        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-txt-3">{sport.name}</span>
        <span className="ml-auto">
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-danger">
              <span className="live-dot relative inline-block w-1.5 h-1.5 text-danger" aria-hidden="true">
                <span className="absolute inset-0 rounded-full bg-current" />
              </span>
              Live
            </span>
          ) : (
            <span className="text-[11.5px] text-txt-3">{formatRelativeDay(game.started_at)}</span>
          )}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {row('home')}
        {row('away')}
      </div>
    </Link>
  );
}
