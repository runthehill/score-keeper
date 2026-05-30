import type { ScoringEventConfig } from '../types';
import { inkOn, rgba } from '../utils/teamColors';

interface Props {
  event: ScoringEventConfig;
  accent: string;
  onClick: () => void;
}

export default function ScoreButton({ event, accent, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="relative flex-1 flex flex-col items-center gap-0.5 rounded-[15px] px-2 pt-3 pb-2.5 press-score"
      style={{ background: accent, color: inkOn(accent), boxShadow: `0 5px 14px ${rgba(accent, 0.3)}` }}
    >
      <span className="font-score font-bold text-[26px] leading-none">+{event.points}</span>
      <span className="text-[11.5px] font-bold">{event.label}</span>
    </button>
  );
}
