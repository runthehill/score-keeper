import { useMemo } from 'react';
import { SPORTS } from '../sports/configs';
import { useDB } from '../hooks/useDB';
import { listGames } from '../db/queries';
import SportCard from '../components/SportCard';
import GameCard from '../components/GameCard';
import AppHeader from '../components/AppHeader';
import InstallBanner from '../components/InstallBanner';

const eyebrow = 'text-[11px] font-extrabold uppercase tracking-[0.08em] text-txt-3 mb-3';

export default function Home() {
  const { db } = useDB();
  const games = useMemo(() => listGames(db), [db]);

  const liveGames = games.filter((g) => g.status === 'in_progress');
  const recentGames = games.filter((g) => g.status === 'completed').slice(0, 5);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="p-4 space-y-6">
      <AppHeader subtitle={today} />
      <InstallBanner />

      {liveGames.length > 0 && (
        <section>
          <h2 className={eyebrow}>In progress</h2>
          <div className="space-y-3">
            {liveGames.map((g) => <GameCard key={g.id} game={g} />)}
          </div>
        </section>
      )}

      <section>
        <h2 className={eyebrow}>New game</h2>
        <div className="grid grid-cols-2 gap-3">
          {SPORTS.map((sport) => <SportCard key={sport.id} sport={sport} />)}
        </div>
      </section>

      {recentGames.length > 0 && (
        <section>
          <h2 className={eyebrow}>Recent</h2>
          <div className="space-y-3">
            {recentGames.map((g) => <GameCard key={g.id} game={g} />)}
          </div>
        </section>
      )}
    </div>
  );
}
