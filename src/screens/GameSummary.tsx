import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Game, GameEvent, Player } from '../types';
import { getSportConfig } from '../sports/configs';
import { useDB } from '../hooks/useDB';
import { getGame, listEvents, listPlayers } from '../db/queries';
import { formatGaelicScore } from '../utils/format';
import { exportGameCSV, exportGameJSON, downloadFile } from '../utils/export';

export default function GameSummary() {
  const { gameId } = useParams<{ gameId: string }>();
  const { db } = useDB();
  const [game, setGame] = useState<Game | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (!gameId) return;
    setGame(getGame(db, gameId) ?? null);
    setEvents(listEvents(db, gameId));
    setPlayers(listPlayers(db, gameId));
  }, [db, gameId]);

  if (!game) {
    return <div className="p-4 text-gray-400">Game not found</div>;
  }

  const sport = getSportConfig(game.sport);
  const isSplit = sport.scoreDisplay === 'split';

  // Period breakdown
  const periodScores = Array.from({ length: sport.periods.count }, (_, i) => {
    const periodEvents = events.filter((e) => e.half_or_period === i + 1);
    const home = periodEvents.filter((e) => e.team === 'home').reduce((s, e) => s + e.points, 0);
    const away = periodEvents.filter((e) => e.team === 'away').reduce((s, e) => s + e.points, 0);
    return { period: i + 1, home, away };
  });

  // Player stats
  const playerStats = players.map((p) => {
    const playerEvents = events.filter((e) => e.player_id === p.id);
    const points = playerEvents.reduce((s, e) => s + e.points, 0);
    const byType = new Map<string, number>();
    playerEvents.forEach((e) => {
      byType.set(e.event_type, (byType.get(e.event_type) ?? 0) + 1);
    });
    return { player: p, points, byType };
  }).filter((s) => s.byType.size > 0);

  const handleExportCSV = () => {
    const csv = exportGameCSV(game, events, players);
    downloadFile(csv, `${game.home_team}-vs-${game.away_team}.csv`, 'text/csv');
  };

  const handleExportJSON = () => {
    const json = exportGameJSON(game, events, players);
    downloadFile(json, `${game.home_team}-vs-${game.away_team}.json`, 'application/json');
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{sport.icon}</span>
        <div>
          <h1 className="text-lg font-bold">{sport.name}</h1>
          <p className="text-xs text-gray-500">{new Date(game.started_at).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Final score */}
      <div className="bg-surface-800 rounded-xl p-6 text-center">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs text-home uppercase tracking-widest font-semibold">{game.home_team}</p>
            <p className="text-4xl font-extrabold text-home mt-2">
              {isSplit ? formatGaelicScore(events, 'home') : game.home_score}
            </p>
            {isSplit && <p className="text-xs text-gray-500">({game.home_score})</p>}
          </div>
          <div className="text-gray-600 font-bold text-lg px-4">-</div>
          <div className="flex-1">
            <p className="text-xs text-away uppercase tracking-widest font-semibold">{game.away_team}</p>
            <p className="text-4xl font-extrabold text-away mt-2">
              {isSplit ? formatGaelicScore(events, 'away') : game.away_score}
            </p>
            {isSplit && <p className="text-xs text-gray-500">({game.away_score})</p>}
          </div>
        </div>
      </div>

      {/* Period breakdown */}
      <div className="bg-surface-800 rounded-xl p-4">
        <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">
          By {sport.periods.name}
        </h2>
        <div className="space-y-2">
          {periodScores.map((ps) => (
            <div key={ps.period} className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {sport.periods.name} {ps.period}
              </span>
              <span>
                <span className="text-home font-semibold">{ps.home}</span>
                <span className="text-gray-600 mx-2">-</span>
                <span className="text-away font-semibold">{ps.away}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Player stats */}
      {playerStats.length > 0 && (
        <div className="bg-surface-800 rounded-xl p-4">
          <h2 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">
            Player Stats
          </h2>
          <div className="space-y-3">
            {playerStats.map(({ player, points, byType }) => (
              <div key={player.id} className="flex items-start justify-between">
                <div>
                  <p className={`font-medium text-sm ${player.team === 'home' ? 'text-home' : 'text-away'}`}>
                    {player.number != null && <span className="text-gray-500 mr-1">#{player.number}</span>}
                    {player.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {Array.from(byType.entries())
                      .map(([type, count]) => `${count} ${type.replace(/_/g, ' ')}`)
                      .join(', ')}
                  </p>
                </div>
                {points > 0 && (
                  <span className="text-sm font-bold">{points} pts</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export */}
      <div className="flex gap-3">
        <button onClick={handleExportCSV} className="flex-1 bg-surface-800 border border-surface-600 rounded-xl py-3 text-sm font-semibold active:bg-surface-700">
          Export CSV
        </button>
        <button onClick={handleExportJSON} className="flex-1 bg-surface-800 border border-surface-600 rounded-xl py-3 text-sm font-semibold active:bg-surface-700">
          Export JSON
        </button>
      </div>

      <Link to="/" className="block text-center text-sm text-gray-500 underline py-2">
        Back to Home
      </Link>
    </div>
  );
}
