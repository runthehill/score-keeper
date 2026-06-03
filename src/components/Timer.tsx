import { formatTimer } from '../utils/format';
import { Play, Pause, Edit } from './icons';

interface Props {
  seconds: number;
  running: boolean;
  overtime?: boolean;
  onToggle: () => void;
  onEdit: () => void;
  periodLabel: string;
}

function LiveDot() {
  return (
    <span className="live-dot relative inline-block w-[7px] h-[7px] text-danger" aria-hidden="true">
      <span className="absolute inset-0 rounded-full bg-current" />
    </span>
  );
}

export default function Timer({ seconds, running, overtime = false, onToggle, onEdit, periodLabel }: Props) {
  return (
    <div className="w-full flex items-center gap-2">
      <button
        onClick={onToggle}
        aria-label={running ? 'Pause timer' : 'Start timer'}
        className="flex-1 flex items-center justify-center gap-3.5 bg-surface-2 border border-line rounded-2xl py-2.5 px-4 text-txt press"
      >
        <span
          className={`grid place-items-center w-[30px] h-[30px] rounded-full ${running ? 'bg-txt text-bg' : 'text-txt-2'}`}
          style={running ? undefined : { boxShadow: 'inset 0 0 0 1px var(--line-2)' }}
        >
          {running ? <Pause size={15} /> : <Play size={14} />}
        </span>
        <span className={`font-score font-semibold text-[30px] leading-none tabular-nums tracking-[0.01em] ${overtime ? 'text-danger' : ''}`}>
          {formatTimer(seconds)}
        </span>
        <span className="flex items-center gap-1.5 ml-0.5">
          {running && <LiveDot />}
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-txt-3">{periodLabel}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={onEdit}
        aria-label="Edit clock"
        className="w-11 h-11 shrink-0 grid place-items-center rounded-2xl bg-surface-2 border border-line text-txt-2 press"
      >
        <Edit size={16} />
      </button>
    </div>
  );
}
