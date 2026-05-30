import type { SportConfig } from '../types';
import { Card, Sub, Undo, Whistle } from './icons';

interface Props {
  sport: SportConfig;
  hasPlayers: boolean;
  onCard: () => void;
  onSub: () => void;
  onUndo: () => void;
  onAdvancePeriod: () => void;
  onStat: (eventType: string) => void;
  currentPeriod: number;
  periodCount: number;
  periodName: string;
  extraPeriodLabel: string | null;
}

export default function ActionsRow({
  sport, hasPlayers, onCard, onSub, onUndo, onAdvancePeriod, onStat,
  currentPeriod, periodCount, periodName, extraPeriodLabel,
}: Props) {
  const isExtra = currentPeriod > periodCount;
  const btnClass = 'flex-1 flex items-center justify-center gap-1.5 bg-surface-2 border border-line rounded-xl py-2.5 text-center text-xs font-semibold text-txt-2 press';

  let periodButtonLabel: string;
  if (isExtra || currentPeriod >= periodCount) {
    periodButtonLabel = extraPeriodLabel ? `End ${extraPeriodLabel}` : 'Full Time';
  } else {
    periodButtonLabel = `Next ${periodName}`;
  }

  return (
    <div className="space-y-2">
      {sport.statEvents.length > 0 && (
        <div className="flex gap-2">
          {sport.statEvents.map((stat) => (
            <button key={stat.type} onClick={() => onStat(stat.type)} className={btnClass}>
              {stat.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        {sport.cardEvents.length > 0 && (
          <button onClick={onCard} className={btnClass}><Card size={15} /> Card</button>
        )}
        {hasPlayers && (
          <button onClick={onSub} className={btnClass}><Sub size={15} /> Sub</button>
        )}
        <button onClick={onUndo} className={btnClass}><Undo size={15} /> Undo</button>
        <button onClick={onAdvancePeriod} className={btnClass}><Whistle size={15} /> {periodButtonLabel}</button>
      </div>
    </div>
  );
}
