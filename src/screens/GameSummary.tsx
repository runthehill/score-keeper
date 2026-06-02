import { useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { GameMetadata } from '../types';
import { getSportConfig } from '../sports/configs';
import { useDB } from '../hooks/useDB';
import { useThemeContext } from '../hooks/useTheme';
import { getGame, listEvents, listPlayers } from '../db/queries';
import { teamAccent } from '../utils/teamColors';
import { formatGaelicScore, eventLabel } from '../utils/format';
import { buildShareModel, shareFilename } from '../utils/shareCard';
import { exportShareCard } from '../utils/exportShareCard';
import { exportGameCSV, exportGameJSON, downloadFile } from '../utils/export';
import ShareCard from '../components/ShareCard';
import { ChevronLeft, Share } from '../components/icons';

export default function GameSummary() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { db } = useDB();
  const { dark } = useThemeContext();
  const game = useMemo(() => (gameId ? getGame(db, gameId) ?? null : null), [db, gameId]);
  const events = useMemo(() => (gameId ? listEvents(db, gameId) : []), [db, gameId]);
  const players = useMemo(() => (gameId ? listPlayers(db, gameId) : []), [db, gameId]);
  const cardRef = useRef<HTMLDivElement>(null);
  const [shareState, setShareState] = useState('');

  if (!game) {
    return <div className="p-4 text-txt-3">Game not found</div>;
  }

  const sport = getSportConfig(game.sport);
  const aHome = teamAccent({ primary: game.home_primary, secondary: game.home_secondary }, dark);
  const aAway = teamAccent({ primary: game.away_primary, secondary: game.away_secondary }, dark);

  let metadata: GameMetadata = {};
  try { if (game.notes) metadata = JSON.parse(game.notes) as GameMetadata; } catch { /* malformed notes JSON — keep default metadata */ }
  const periodCount = metadata.periodCount ?? sport.periods.count;
  const periodName = metadata.periodName ?? sport.periods.name;

  const isSplit = sport.scoreDisplay === 'split';
  const maxPeriod = events.length > 0 ? Math.max(...events.map((e) => e.half_or_period)) : periodCount;
  const periodScores = Array.from({ length: maxPeriod }, (_, i) => {
    const periodEvents = events.filter((e) => e.half_or_period === i + 1);
    // Gaelic shows goals-points per period (e.g. "1-03"); other sports show the points total.
    const home = isSplit
      ? formatGaelicScore(periodEvents, 'home')
      : periodEvents.filter((e) => e.team === 'home').reduce((s, e) => s + e.points, 0);
    const away = isSplit
      ? formatGaelicScore(periodEvents, 'away')
      : periodEvents.filter((e) => e.team === 'away').reduce((s, e) => s + e.points, 0);
    return { period: i + 1, home, away };
  });

  const playerStats = players.map((p) => {
    const playerEvents = events.filter((e) => e.player_id === p.id);
    const points = playerEvents.reduce((s, e) => s + e.points, 0);
    const byType = new Map<string, number>();
    playerEvents.forEach((e) => { byType.set(e.event_type, (byType.get(e.event_type) ?? 0) + 1); });
    return { player: p, points, byType };
  }).filter((s) => s.byType.size > 0);

  const handleShare = async () => {
    if (!cardRef.current) return;
    setShareState('Preparing…');
    try {
      const model = buildShareModel(game, events, sport, { variant: 'final' });
      const outcome = await exportShareCard(
        cardRef.current,
        shareFilename(game.home_team, game.away_team),
        { title: `${game.home_team} v ${game.away_team}`, text: `${model.home.name} ${model.home.score} – ${model.away.name} ${model.away.score}` }
      );
      setShareState(outcome === 'shared' ? 'Shared' : outcome === 'downloaded' ? 'Image saved' : outcome === 'cancelled' ? '' : "Couldn't create image");
    } catch {
      setShareState("Couldn't create image");
    }
  };

  const handleExportCSV = () => downloadFile(exportGameCSV(game, events, players), `${game.home_team}-vs-${game.away_team}.csv`, 'text/csv');
  const handleExportJSON = () => downloadFile(exportGameJSON(game, events, players), `${game.home_team}-vs-${game.away_team}.json`, 'application/json');

  const eyebrow = 'text-[11px] font-extrabold uppercase tracking-[0.08em] text-txt-3 mb-3';

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate('/')} aria-label="Back" className="w-9 h-9 shrink-0 grid place-items-center rounded-full bg-surface-2 border border-line text-txt press">
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-txt-3">Full time</div>
          <h1 className="text-xl font-extrabold text-txt -tracking-[0.02em] truncate flex items-center gap-2"><span aria-hidden="true">{sport.icon}</span> {sport.name}</h1>
        </div>
      </div>

      {/* Hero share card */}
      <ShareCard ref={cardRef} game={game} events={events} sport={sport} variant="final" />

      {/* By period */}
      <section>
        <h2 className={eyebrow}>By {periodName.toLowerCase()}</h2>
        <div className="bg-surface border border-line rounded-2xl p-4 space-y-2">
          {periodScores.map((ps) => (
            <div key={ps.period} className="flex items-center justify-between text-sm">
              <span className="text-txt-3">{ps.period <= periodCount ? `${periodName} ${ps.period}` : `Extra ${ps.period - periodCount}`}</span>
              <span className="font-score tabular-nums">
                <span className="font-bold" style={{ color: aHome }}>{ps.home}</span>
                <span className="text-txt-3 mx-2">-</span>
                <span className="font-bold" style={{ color: aAway }}>{ps.away}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Player stats */}
      {playerStats.length > 0 && (
        <section>
          <h2 className={eyebrow}>Player stats</h2>
          <div className="bg-surface border border-line rounded-2xl p-4 space-y-3">
            {playerStats.map(({ player, points, byType }) => (
              <div key={player.id} className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-sm" style={{ color: player.team === 'home' ? aHome : aAway }}>
                    {player.number != null && <span className="text-txt-3 mr-1">#{player.number}</span>}
                    {player.name}
                  </p>
                  <p className="text-xs text-txt-3">
                    {Array.from(byType.entries()).map(([type, count]) => `${count} ${eventLabel(sport, type)}`).join(', ')}
                  </p>
                </div>
                {points > 0 && <span className="text-sm font-bold text-txt shrink-0 ml-3">{points} pts</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Share */}
      <div>
        <button type="button" onClick={handleShare} disabled={shareState === 'Preparing…'} className="w-full flex items-center justify-center gap-2 bg-txt text-bg rounded-xl py-3.5 text-sm font-bold disabled:opacity-50 press">
          <Share size={16} /> Share result
        </button>
        {shareState && <p className="text-center text-xs text-txt-3 mt-2">{shareState}</p>}
      </div>

      {/* Export */}
      <div className="flex gap-3">
        <button type="button" onClick={handleExportCSV} className="flex-1 bg-surface-2 border border-line rounded-xl py-3 text-sm font-semibold text-txt-2 press">Export CSV</button>
        <button type="button" onClick={handleExportJSON} className="flex-1 bg-surface-2 border border-line rounded-xl py-3 text-sm font-semibold text-txt-2 press">Export JSON</button>
      </div>

      <Link to="/" className="block text-center text-sm text-txt-3 underline py-2">Back to Home</Link>
    </div>
  );
}
