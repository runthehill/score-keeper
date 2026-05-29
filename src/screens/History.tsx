import { useMemo, useState } from 'react';
import type { Sport } from '../types';
import { SPORTS } from '../sports/configs';
import { useDB } from '../hooks/useDB';
import { listGames } from '../db/queries';
import GameCard from '../components/GameCard';

export default function History() {
  const { db } = useDB();
  const [filter, setFilter] = useState<Sport | 'all'>('all');
  const games = useMemo(
    () => listGames(db, filter === 'all' ? undefined : filter),
    [db, filter]
  );

  const completedGames = games.filter((g) => g.status === 'completed');

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">History</h1>

      {/* Sport filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
            filter === 'all' ? 'bg-accent text-white' : 'bg-surface-700 text-gray-400'
          }`}
        >
          All
        </button>
        {SPORTS.map((sport) => (
          <button
            key={sport.id}
            onClick={() => setFilter(sport.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
              filter === sport.id ? 'bg-accent text-white' : 'bg-surface-700 text-gray-400'
            }`}
          >
            {sport.icon} {sport.name}
          </button>
        ))}
      </div>

      {/* Game list */}
      {completedGames.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No completed games yet</p>
          <p className="text-xs text-gray-600 mt-1">Start a game from the home screen</p>
        </div>
      ) : (
        <div className="space-y-3">
          {completedGames.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      )}
    </div>
  );
}
