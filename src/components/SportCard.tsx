import { Link } from 'react-router-dom';
import type { SportConfig, Sport } from '../types';
import { rgba } from '../utils/teamColors';

const TINTS: Record<Sport, string> = {
  rugby_union: '#ea493c',
  soccer: '#47b26c',
  gaelic_football: '#16245A',
  basketball: '#F25F1F',
  hurling: '#1E63D6',
  camogie: '#5B2A86',
};

interface Props {
  sport: SportConfig;
}

export default function SportCard({ sport }: Props) {
  const tint = TINTS[sport.id];
  return (
    <Link to={`/setup/${sport.id}`} className="bg-surface border border-line rounded-2xl p-4 flex flex-col gap-3 press">
      <div className="w-12 h-12 rounded-[13px] grid place-items-center text-2xl" style={{ background: rgba(tint, 0.14) }}>
        <span aria-hidden="true">{sport.icon}</span>
      </div>
      <div>
        <h3 className="font-extrabold text-[15px] text-txt -tracking-[0.01em]">{sport.name}</h3>
        <p className="text-[11.5px] text-txt-3 mt-0.5">{sport.periods.count} {sport.periods.name.toLowerCase()}s</p>
      </div>
    </Link>
  );
}
