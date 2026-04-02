import { Link } from 'react-router-dom';
import type { SportConfig } from '../types';

interface Props {
  sport: SportConfig;
}

export default function SportCard({ sport }: Props) {
  return (
    <Link
      to={`/setup/${sport.id}`}
      className="bg-surface-800 rounded-xl p-4 flex items-center gap-4 active:bg-surface-700 transition-colors"
    >
      <span className="text-3xl">{sport.icon}</span>
      <div>
        <h3 className="font-bold text-base">{sport.name}</h3>
        <p className="text-xs text-gray-400">
          {sport.periods.count} {sport.periods.name.toLowerCase()}s
        </p>
      </div>
    </Link>
  );
}
