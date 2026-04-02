import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Team } from '../types';
import { getSportConfig } from '../sports/configs';
import { useGame } from '../hooks/useGame';
import { useTimer } from '../hooks/useTimer';
import { useDB } from '../hooks/useDB';
import { endGame } from '../db/queries';
import Scoreboard from '../components/Scoreboard';
import ScoringRow from '../components/ScoringRow';
import Timer from '../components/Timer';
import EventLog from '../components/EventLog';
import ActionsRow from '../components/ActionsRow';
import PlayerPicker from '../components/PlayerPicker';
import SubstitutionFlow from '../components/SubstitutionFlow';

export default function LiveGame() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { db, persist } = useDB();
  const { game, events, players, currentPeriod, addEvent, undoLastEvent, advancePeriod, substitute } =
    useGame(gameId!);
  const timer = useTimer();

  const [pendingScore, setPendingScore] = useState<{
    team: Team;
    eventType: string;
    points: number;
  } | null>(null);
  const [showSub, setShowSub] = useState(false);
  const [showCardPicker, setShowCardPicker] = useState(false);
  const [pendingStatTeam, setPendingStatTeam] = useState<{ team: Team; eventType: string } | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  // Wake lock — keep screen on while scoring
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch {}
    }
    requestWakeLock();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      wakeLock?.release();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const sport = game ? getSportConfig(game.sport) : null;
  const hasPlayers = players.length > 0;
  const homePlayers = players.filter((p) => p.team === 'home');
  const awayPlayers = players.filter((p) => p.team === 'away');

  const handleScore = useCallback(
    (team: Team, eventType: string, points: number) => {
      if (hasPlayers) {
        setPendingScore({ team, eventType, points });
      } else {
        addEvent(team, eventType, points);
      }
    },
    [hasPlayers, addEvent]
  );

  const handlePlayerSelected = useCallback(
    (playerId: string) => {
      if (pendingScore) {
        addEvent(pendingScore.team, pendingScore.eventType, pendingScore.points, playerId);
        setPendingScore(null);
      }
      if (pendingStatTeam) {
        addEvent(pendingStatTeam.team, pendingStatTeam.eventType, 0, playerId);
        setPendingStatTeam(null);
      }
    },
    [pendingScore, pendingStatTeam, addEvent]
  );

  const handleSkipPlayer = useCallback(() => {
    if (pendingScore) {
      addEvent(pendingScore.team, pendingScore.eventType, pendingScore.points);
      setPendingScore(null);
    }
    if (pendingStatTeam) {
      addEvent(pendingStatTeam.team, pendingStatTeam.eventType, 0);
      setPendingStatTeam(null);
    }
  }, [pendingScore, pendingStatTeam, addEvent]);

  const handleStat = useCallback(
    (eventType: string) => {
      // For stats, we need to pick a team first, then optionally a player
      // Simple approach: show team picker then player picker
      // For now, use home team — we'll add team selection via the card picker pattern
      if (hasPlayers) {
        setPendingStatTeam({ team: 'home', eventType });
      } else {
        addEvent('home', eventType, 0);
      }
    },
    [hasPlayers, addEvent]
  );

  const handleAdvancePeriod = useCallback(() => {
    if (sport && currentPeriod >= sport.periods.count) {
      setShowEndConfirm(true);
    } else {
      advancePeriod();
      timer.reset();
    }
  }, [sport, currentPeriod, advancePeriod, timer]);

  const handleEndGame = useCallback(() => {
    endGame(db, gameId!, new Date().toISOString());
    persist();
    navigate(`/summary/${gameId}`, { replace: true });
  }, [db, gameId, persist, navigate]);

  if (!game || !sport) {
    return <div className="p-4 text-gray-400">Loading game...</div>;
  }

  return (
    <div className="p-3 space-y-3 pb-24">
      {/* Sport badge + period */}
      <div className="flex items-center justify-between">
        <span className="bg-accent px-3 py-1 rounded-full text-xs font-semibold">
          {sport.name.toUpperCase()}
        </span>
        <span className="text-xs text-gray-400">
          {sport.periods.name} {currentPeriod} of {sport.periods.count}
        </span>
      </div>

      {/* Scoreboard */}
      <Scoreboard game={game} events={events} />

      {/* Timer */}
      <Timer seconds={timer.seconds} running={timer.running} onToggle={timer.toggle} />

      {/* Home scoring buttons */}
      <ScoringRow
        events={sport.scoringEvents}
        team="home"
        teamName={game.home_team}
        onScore={(type, pts) => handleScore('home', type, pts)}
      />

      {/* Away scoring buttons */}
      <ScoringRow
        events={sport.scoringEvents}
        team="away"
        teamName={game.away_team}
        onScore={(type, pts) => handleScore('away', type, pts)}
      />

      {/* Actions row */}
      <ActionsRow
        sport={sport}
        hasPlayers={hasPlayers}
        onCard={() => setShowCardPicker(true)}
        onSub={() => setShowSub(true)}
        onUndo={undoLastEvent}
        onAdvancePeriod={handleAdvancePeriod}
        onStat={handleStat}
        currentPeriod={currentPeriod}
      />

      {/* Event log */}
      <EventLog
        events={events}
        players={players}
        gameStartedAt={game.started_at}
      />

      {/* End game button */}
      <button
        onClick={() => setShowEndConfirm(true)}
        className="w-full py-3 text-center text-sm text-gray-500 border border-surface-600 rounded-lg"
      >
        End Game
      </button>

      {/* Player picker for scoring */}
      {(pendingScore || pendingStatTeam) && hasPlayers && (
        <PlayerPicker
          players={pendingScore ? players.filter((p) => p.team === pendingScore.team) : players}
          title={pendingScore ? `Who scored the ${pendingScore.eventType.replace(/_/g, ' ')}?` : 'Which player?'}
          onSelect={handlePlayerSelected}
          onSkip={handleSkipPlayer}
          onClose={() => { setPendingScore(null); setPendingStatTeam(null); }}
        />
      )}

      {/* Substitution flow */}
      {showSub && (
        <SubstitutionFlow
          homePlayers={homePlayers}
          awayPlayers={awayPlayers}
          homeTeamName={game.home_team}
          awayTeamName={game.away_team}
          onSubstitute={substitute}
          onClose={() => setShowSub(false)}
        />
      )}

      {/* Card picker — pick card type, then team */}
      {showCardPicker && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowCardPicker(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full bg-surface-800 rounded-t-2xl p-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-gray-400 mb-3">Issue Card</p>
            <div className="space-y-2">
              {sport.cardEvents.map((card) => (
                <div key={card.type} className="flex gap-2">
                  <button
                    onClick={() => { addEvent('home', card.type, 0); setShowCardPicker(false); }}
                    className="flex-1 bg-home-dark border border-home rounded-lg py-3 text-sm font-medium"
                  >
                    <span style={{ color: card.color }}>●</span> {card.label} — {game.home_team}
                  </button>
                  <button
                    onClick={() => { addEvent('away', card.type, 0); setShowCardPicker(false); }}
                    className="flex-1 bg-away-dark border border-away rounded-lg py-3 text-sm font-medium"
                  >
                    <span style={{ color: card.color }}>●</span> {card.label} — {game.away_team}
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setShowCardPicker(false)} className="w-full mt-3 py-3 text-center text-sm text-gray-500">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* End game confirmation */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowEndConfirm(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-surface-800 rounded-2xl p-6 mx-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">End Game?</h3>
            <p className="text-sm text-gray-400 mb-4">
              {game.home_team} {game.home_score} - {game.away_score} {game.away_team}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 py-3 border border-surface-600 rounded-lg text-sm font-medium"
              >
                Continue
              </button>
              <button
                onClick={handleEndGame}
                className="flex-1 py-3 bg-accent rounded-lg text-sm font-bold"
              >
                End Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
