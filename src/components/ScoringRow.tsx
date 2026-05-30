import type { GameEvent, ScoringEventConfig, Team } from '../types';
import { useThemeContext } from '../hooks/useTheme';
import { teamAccent } from '../utils/teamColors';
import { formatGaelicScore } from '../utils/format';
import TeamKitChip from './TeamKitChip';
import ScoreButton from './ScoreButton';

interface Props {
  events: ScoringEventConfig[];
  team: Team;
  teamName: string;
  primary: string;
  secondary: string;
  score: number;
  isSplit: boolean;
  gameEvents: GameEvent[];
  onScore: (eventType: string, points: number) => void;
}

export default function ScoringRow({ events, team, teamName, primary, secondary, score, isSplit, gameEvents, onScore }: Props) {
  const { dark } = useThemeContext();
  const accent = teamAccent({ primary, secondary }, dark);
  const scoreText = isSplit ? formatGaelicScore(gameEvents, team) : String(score);
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-2.5">
        <TeamKitChip primary={primary} secondary={secondary} size={22} radius={7} />
        <span className="text-[13px] font-extrabold text-txt -tracking-[0.01em]">{teamName}</span>
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-txt-3">{team}</span>
        <span className="ml-auto font-score font-semibold text-xl tabular-nums" style={{ color: accent }}>{scoreText}</span>
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${events.length}, minmax(0, 1fr))` }}>
        {events.map((event) => (
          <ScoreButton key={event.type} event={event} accent={accent} onClick={() => onScore(event.type, event.points)} />
        ))}
      </div>
    </div>
  );
}
