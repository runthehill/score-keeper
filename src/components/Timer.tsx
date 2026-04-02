import { formatTimer } from '../utils/format';

interface Props {
  seconds: number;
  running: boolean;
  onToggle: () => void;
}

export default function Timer({ seconds, running, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center justify-center gap-2 py-2"
    >
      <span className="text-2xl font-bold tabular-nums font-score">{formatTimer(seconds)}</span>
      <span className="text-xs text-gray-500">{running ? '⏸ tap to pause' : '▶ tap to start'}</span>
    </button>
  );
}
