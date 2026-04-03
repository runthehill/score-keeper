import type { SportConfig } from '../types';

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
  sport,
  hasPlayers,
  onCard,
  onSub,
  onUndo,
  onAdvancePeriod,
  onStat,
  currentPeriod,
  periodCount,
  periodName,
  extraPeriodLabel,
}: Props) {
  const isExtra = currentPeriod > periodCount;
  const btnClass = 'flex-1 bg-surface-600 rounded-lg py-2.5 text-center text-xs font-medium text-gray-300 active:bg-surface-700';

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
              {stat.icon} {stat.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        {sport.cardEvents.length > 0 && (
          <button onClick={onCard} className={btnClass}>⚠ Card</button>
        )}
        {hasPlayers && (
          <button onClick={onSub} className={btnClass}>🔄 Sub</button>
        )}
        <button onClick={onUndo} className={btnClass}>↩ Undo</button>
        <button onClick={onAdvancePeriod} className={btnClass}>
          ▶ {periodButtonLabel}
        </button>
      </div>
    </div>
  );
}
