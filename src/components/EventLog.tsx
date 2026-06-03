import type { Game, GameEvent, Player, Team } from '../types';
import { useThemeContext } from '../hooks/useTheme';
import { teamAccent } from '../utils/teamColors';
import { formatEventTime, formatTimer, runningTally, eventLabel } from '../utils/format';
import { getSportConfig } from '../sports/configs';

interface Props {
  events: GameEvent[];
  players: Player[];
  game: Game;
  gameStartedAt: string;
}

export default function EventLog({ events, players, game, gameStartedAt }: Props) {
  const { dark } = useThemeContext();
  const playerMap = new Map(players.map((p) => [p.id, p]));

  const accentFor = (team: Team) =>
    team === 'home'
      ? teamAccent({ primary: game.home_primary, secondary: game.home_secondary }, dark)
      : teamAccent({ primary: game.away_primary, secondary: game.away_secondary }, dark);

  if (events.length === 0) {
    return (
      <div className="bg-surface rounded-2xl border border-line p-5 text-center text-[13px] text-txt-3">
        No plays yet — tap a button above to log the first score.
      </div>
    );
  }

  const sport = getSportConfig(game.sport);
  const isSplit = sport.scoreDisplay === 'split';
  // Running tally forward (Gaelic shows goals-points; other sports a point total),
  // then show newest first in the scroll area.
  const tallies = runningTally(events, isSplit);
  const rows = events.map((event, i) => ({ event, tally: tallies[i] })).reverse();

  return (
    <div className="bg-surface rounded-2xl border border-line p-3">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-txt-3 mb-1.5 px-1">Recent</p>
      <div className="flex flex-col max-h-56 overflow-y-auto">
        {rows.map(({ event: e, tally }) => {
          const isHome = e.team === 'home';
          const accent = accentFor(e.team);
          const teamName = isHome ? game.home_team : game.away_team;
          const player = e.player_id ? playerMap.get(e.player_id) : undefined;
          const label = eventLabel(sport, e.event_type);
          return (
            <div key={e.id} className="flex items-center gap-3 py-2 px-1">
              <span className="font-score font-semibold text-sm text-txt-3 w-[42px] tabular-nums shrink-0">
                {e.clock_seconds != null ? formatTimer(e.clock_seconds) : formatEventTime(e.timestamp, gameStartedAt)}
              </span>
              <span className="w-[3px] h-[22px] rounded-full shrink-0" style={{ background: accent }} />
              <span className="text-[13.5px] font-bold text-txt shrink-0">{label}</span>
              <span className="text-[12.5px] text-txt-3 truncate flex-1 min-w-0">{teamName}{player ? ` · ${player.name}` : ''}</span>
              <span className="flex items-center gap-2.5 shrink-0">
                <span className="font-score text-[13px] text-txt-3 tabular-nums">{isSplit ? `${tally.home} v ${tally.away}` : `${tally.home}-${tally.away}`}</span>
                {e.points > 0 && <span className="font-score font-bold text-[15px]" style={{ color: accent }}>+{e.points}</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
