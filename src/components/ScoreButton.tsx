import type { ScoringEventConfig } from '../types';
import { inkOn, rgba } from '../utils/teamColors';

interface Props {
  event: ScoringEventConfig;
  accent: string;
  onClick: () => void;
  onMiss?: () => void;
}

export default function ScoreButton({ event, accent, onClick, onMiss }: Props) {
  // Missable scoring button (basketball): a filled "made" area over a thin "miss"
  // strip, joined in one rounded container. Made records the score; miss records
  // a 0-point attempt.
  if (event.miss && onMiss) {
    return (
      <div className="relative flex flex-col rounded-[15px] overflow-hidden" style={{ boxShadow: `0 5px 14px ${rgba(accent, 0.3)}` }}>
        <button
          type="button"
          onClick={onClick}
          className="flex flex-col items-center gap-0.5 px-2 pt-3 pb-2 press-score"
          style={{ background: accent, color: inkOn(accent) }}
        >
          <span className="font-score font-bold text-[24px] leading-none">+{event.points}</span>
          <span className="text-[11.5px] font-bold">{event.label}</span>
        </button>
        <button
          type="button"
          onClick={onMiss}
          aria-label={event.miss.label}
          className="flex items-center justify-center py-1.5 press-score"
          style={{ background: rgba(accent, 0.16), color: accent }}
        >
          <span className="text-[11px] font-bold">✗ miss</span>
        </button>
      </div>
    );
  }

  // 0-point events (e.g. a Gaelic wide) are tallies, not scores — a de-emphasised
  // outline button with just the label, alongside the filled scoring buttons.
  if (event.points === 0) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="relative flex-1 flex items-center justify-center rounded-[15px] px-2 py-3 press-score text-txt-2"
        style={{ boxShadow: 'inset 0 0 0 1px var(--line-2)' }}
      >
        <span className="text-[13px] font-bold">{event.label}</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex-1 flex flex-col items-center gap-0.5 rounded-[15px] px-2 pt-3 pb-2.5 press-score"
      style={{ background: accent, color: inkOn(accent), boxShadow: `0 5px 14px ${rgba(accent, 0.3)}` }}
    >
      <span className="font-score font-bold text-[26px] leading-none">+{event.points}</span>
      <span className="text-[11.5px] font-bold">{event.label}</span>
    </button>
  );
}
