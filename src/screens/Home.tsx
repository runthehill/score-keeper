import { useEffect, useState } from 'react';
import { SPORTS } from '../sports/configs';
import { useDB } from '../hooks/useDB';
import { listGames } from '../db/queries';
import type { Game } from '../types';
import SportCard from '../components/SportCard';
import GameCard from '../components/GameCard';

export default function Home() {
  const { db } = useDB();
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    setGames(listGames(db));
  }, [db]);

  const liveGames = games.filter((g) => g.status === 'in_progress');
  const recentGames = games.filter((g) => g.status === 'completed').slice(0, 5);

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Jonathan's Score Keeper</h1>

      {liveGames.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            In Progress
          </h2>
          <div className="space-y-3">
            {liveGames.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          New Game
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {SPORTS.map((sport) => (
            <SportCard key={sport.id} sport={sport} />
          ))}
        </div>
      </section>

      {recentGames.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Recent
          </h2>
          <div className="space-y-3">
            {recentGames.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
