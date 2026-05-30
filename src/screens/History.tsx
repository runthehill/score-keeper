import { useMemo, useState } from 'react';
import type { Sport } from '../types';
import { SPORTS } from '../sports/configs';
import { useDB } from '../hooks/useDB';
import { listGames } from '../db/queries';
import GameCard from '../components/GameCard';
import AppHeader from '../components/AppHeader';

export default function History() {
  const { db } = useDB();
  const [filter, setFilter] = useState<Sport | 'all'>('all');
  const games = useMemo(
    () => listGames(db, filter === 'all' ? undefined : filter),
    [db, filter]
  );
  const completedGames = games.filter((g) => g.status === 'completed');

  const pill = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap press ${active ? 'bg-txt text-bg' : 'bg-surface-2 border border-line text-txt-2'}`;

  return (
    <div className="p-4 space-y-4">
      <AppHeader subtitle="Past games" />

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button type="button" onClick={() => setFilter('all')} className={pill(filter === 'all')}>All</button>
        {SPORTS.map((sport) => (
          <button key={sport.id} type="button" onClick={() => setFilter(sport.id)} className={pill(filter === sport.id)}>
            {sport.icon} {sport.name}
          </button>
        ))}
      </div>

      {completedGames.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-txt-3">No completed games yet</p>
          <p className="text-xs text-txt-3 mt-1">Start a game from the home screen</p>
        </div>
      ) : (
        <>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-txt-3">All games · {completedGames.length}</p>
          <div className="space-y-3">
            {completedGames.map((g) => <GameCard key={g.id} game={g} />)}
          </div>
        </>
      )}
    </div>
  );
}
