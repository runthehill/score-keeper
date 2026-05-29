import type { GameEvent, Player } from '../types';
import { formatEventTime } from '../utils/format';

interface Props {
  events: GameEvent[];
  players: Player[];
  gameStartedAt: string;
}

export default function EventLog({ events, players, gameStartedAt }: Props) {
  const playerMap = new Map(players.map((p) => [p.id, p]));

  // Calculate running scores forward, then display most recent first
  const withScores: { event: GameEvent; home: number; away: number }[] = [];
  let homeRunning = 0;
  let awayRunning = 0;
  for (const event of events) {
    if (event.team === 'home') homeRunning += event.points;
    else awayRunning += event.points;
    withScores.push({ event, home: homeRunning, away: awayRunning });
  }

  const rows = [...withScores].reverse().map(({ event, home, away }) => {
    const player = event.player_id ? playerMap.get(event.player_id) : undefined;
    const isHome = event.team === 'home';
    const label = event.event_type.replace(/_/g, ' ');

    return (
      <div key={event.id} className="text-xs text-gray-400 py-1.5 border-b border-surface-700 last:border-0">
        <span className="text-gray-600">{formatEventTime(event.timestamp, gameStartedAt)}</span>
        {' · '}
        <span className="capitalize">{label}</span>
        {player && <span> · {player.name}</span>}
        {' · '}
        <span className={isHome ? 'text-home' : 'text-away'}>
          {home}-{away}
        </span>
      </div>
    );
  });

  if (events.length === 0) {
    return (
      <div className="bg-surface-800 rounded-xl p-4">
        <p className="text-xs text-gray-600 text-center">No events yet</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-800 rounded-xl p-3">
      <p className="text-xs text-gray-600 uppercase tracking-wider mb-2">Recent</p>
      <div className="max-h-40 overflow-y-auto">{rows}</div>
    </div>
  );
}
