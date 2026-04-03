import { useState, useCallback, useEffect, useMemo } from 'react';
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
  const { game, events, players, currentPeriod, periodCount, periodName, addEvent, undoLastEvent, advancePeriod, substitute } =
    useGame(gameId!);
  const timer = useTimer();

  const [pendingScore, setPendingScore] = useState<{
    team: Team;
    eventType: string;
    points: number;
  } | null>(null);
  const [showSub, setShowSub] = useState(false);
  const [showCardPicker, setShowCardPicker] = useState(false);
  const [pendingCard, setPendingCard] = useState<{ team: Team; cardType: string } | null>(null);
  const [pendingStatTeam, setPendingStatTeam] = useState<{ team: Team; eventType: string } | null>(null);
  const [showEndOptions, setShowEndOptions] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showStatTeamPicker, setShowStatTeamPicker] = useState<string | null>(null);
  const [showPeriodConfirm, setShowPeriodConfirm] = useState(false);
  const [extraPeriodLabel, setExtraPeriodLabel] = useState<string | null>(null);

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
  const homePlayers = players.filter((p) => p.team === 'home');
  const awayPlayers = players.filter((p) => p.team === 'away');
  const hasHomePlayers = homePlayers.length > 0;
  const hasAwayPlayers = awayPlayers.length > 0;
  const hasAnyPlayers = players.length > 0;

  // Helper: does a given team have players registered?
  const teamHasPlayers = useCallback(
    (team: Team) => (team === 'home' ? hasHomePlayers : hasAwayPlayers),
    [hasHomePlayers, hasAwayPlayers]
  );

  // Basketball team fouls for current period
  const teamFouls = useMemo(() => {
    if (!sport || sport.id !== 'basketball') return null;
    const periodEvents = events.filter((e) => e.half_or_period === currentPeriod && e.event_type === 'foul');
    return {
      home: periodEvents.filter((e) => e.team === 'home').length,
      away: periodEvents.filter((e) => e.team === 'away').length,
    };
  }, [sport, events, currentPeriod]);

  const handleScore = useCallback(
    (team: Team, eventType: string, points: number) => {
      if (teamHasPlayers(team)) {
        setPendingScore({ team, eventType, points });
      } else {
        addEvent(team, eventType, points);
      }
    },
    [teamHasPlayers, addEvent]
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
      if (pendingCard) {
        addEvent(pendingCard.team, pendingCard.cardType, 0, playerId);
        setPendingCard(null);
      }
    },
    [pendingScore, pendingStatTeam, pendingCard, addEvent]
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
    if (pendingCard) {
      addEvent(pendingCard.team, pendingCard.cardType, 0);
      setPendingCard(null);
    }
  }, [pendingScore, pendingStatTeam, pendingCard, addEvent]);

  const handleStat = useCallback(
    (eventType: string) => {
      setShowStatTeamPicker(eventType);
    },
    []
  );

  const handleStatTeamSelected = useCallback(
    (team: Team, eventType: string) => {
      setShowStatTeamPicker(null);
      if (teamHasPlayers(team)) {
        setPendingStatTeam({ team, eventType });
      } else {
        addEvent(team, eventType, 0);
      }
    },
    [teamHasPlayers, addEvent]
  );

  // Card flow: pick card type → pick team → pick player (if team has players)
  const handleCardTeamSelected = useCallback(
    (team: Team, cardType: string) => {
      setShowCardPicker(false);
      if (teamHasPlayers(team)) {
        setPendingCard({ team, cardType });
      } else {
        addEvent(team, cardType, 0);
      }
    },
    [teamHasPlayers, addEvent]
  );

  // Is the game in an extra period (beyond regular time)?
  const isExtraPeriod = currentPeriod > periodCount;

  const handleAdvancePeriod = useCallback(() => {
    if (currentPeriod >= periodCount) {
      // End of regulation (or end of extra period) — show options
      setShowEndOptions(true);
    } else {
      setShowPeriodConfirm(true);
    }
  }, [currentPeriod, periodCount]);

  const confirmAdvancePeriod = useCallback(() => {
    advancePeriod();
    timer.reset();
    setShowPeriodConfirm(false);
  }, [advancePeriod, timer]);

  const handleEndGame = useCallback(() => {
    endGame(db, gameId!, new Date().toISOString());
    persist();
    navigate(`/summary/${gameId}`, { replace: true });
  }, [db, gameId, persist, navigate]);

  if (!game || !sport) {
    return <div className="p-4 text-gray-400">Loading game...</div>;
  }

  // Determine which pending action needs a player picker
  const pendingAction = pendingScore || pendingStatTeam || pendingCard;
  const pendingTeam = pendingScore?.team ?? pendingStatTeam?.team ?? pendingCard?.team;
  const pendingTitle = pendingScore
    ? `Who scored the ${pendingScore.eventType.replace(/_/g, ' ')}?`
    : pendingCard
      ? `Who received the card?`
      : 'Which player?';

  return (
    <div className="p-3 space-y-3 pb-8">
      {/* Sport badge + period */}
      <div className="flex items-center justify-between">
        <span className="bg-accent px-3 py-1 rounded-full text-xs font-semibold">
          {sport.name.toUpperCase()}
        </span>
        <span className="text-xs text-gray-400">
          {extraPeriodLabel
            ? extraPeriodLabel
            : `${periodName} ${currentPeriod} of ${periodCount}`}
        </span>
      </div>

      {/* Scoreboard */}
      <Scoreboard game={game} events={events} />

      {/* Basketball team fouls */}
      {teamFouls && (
        <div className="flex justify-between px-4 text-xs">
          <span className={`font-semibold ${teamFouls.home >= 5 ? 'text-red-400' : 'text-gray-400'}`}>
            Team Fouls: {teamFouls.home}{teamFouls.home >= 5 ? ' BONUS' : ''}
          </span>
          <span className={`font-semibold ${teamFouls.away >= 5 ? 'text-red-400' : 'text-gray-400'}`}>
            Team Fouls: {teamFouls.away}{teamFouls.away >= 5 ? ' BONUS' : ''}
          </span>
        </div>
      )}

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
        hasPlayers={hasAnyPlayers}
        onCard={() => setShowCardPicker(true)}
        onSub={() => setShowSub(true)}
        onUndo={undoLastEvent}
        onAdvancePeriod={handleAdvancePeriod}
        onStat={handleStat}
        currentPeriod={currentPeriod}
        periodCount={periodCount}
        periodName={periodName}
        extraPeriodLabel={extraPeriodLabel}
      />

      {/* Event log */}
      <EventLog
        events={events}
        players={players}
        gameStartedAt={game.started_at}
      />

      {/* End game button */}
      <button
        onClick={() => setShowEndOptions(true)}
        className="w-full py-3 text-center text-sm text-gray-500 border border-surface-600 rounded-lg"
      >
        End Game
      </button>

      {/* Player picker for scoring, stats, and cards */}
      {pendingAction && pendingTeam && teamHasPlayers(pendingTeam) && (
        <PlayerPicker
          players={players.filter((p) => p.team === pendingTeam)}
          title={pendingTitle}
          onSelect={handlePlayerSelected}
          onSkip={handleSkipPlayer}
          onClose={() => { setPendingScore(null); setPendingStatTeam(null); setPendingCard(null); }}
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

      {/* Card picker — pick card type + team, then player */}
      {showCardPicker && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowCardPicker(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full bg-surface-800 rounded-t-2xl p-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-gray-400 mb-3">Issue Card</p>
            <div className="space-y-2">
              {sport.cardEvents.map((card) => (
                <div key={card.type} className="flex gap-2">
                  <button
                    onClick={() => handleCardTeamSelected('home', card.type)}
                    className="flex-1 bg-home-dark border border-home rounded-lg py-3 text-sm font-medium"
                  >
                    <span style={{ color: card.color }}>●</span> {card.label} — {game.home_team}
                  </button>
                  <button
                    onClick={() => handleCardTeamSelected('away', card.type)}
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

      {/* Stat team picker */}
      {showStatTeamPicker && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowStatTeamPicker(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full bg-surface-800 rounded-t-2xl p-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-gray-400 mb-3">Which team?</p>
            <div className="space-y-2">
              <button
                onClick={() => handleStatTeamSelected('home', showStatTeamPicker)}
                className="w-full bg-home-dark border border-home rounded-lg py-3 font-semibold text-home active:opacity-80"
              >
                {game.home_team}
              </button>
              <button
                onClick={() => handleStatTeamSelected('away', showStatTeamPicker)}
                className="w-full bg-away-dark border border-away rounded-lg py-3 font-semibold text-away active:opacity-80"
              >
                {game.away_team}
              </button>
            </div>
            <button onClick={() => setShowStatTeamPicker(null)} className="w-full mt-3 py-3 text-center text-sm text-gray-500">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Period advance confirmation */}
      {showPeriodConfirm && sport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowPeriodConfirm(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-surface-800 rounded-2xl p-6 mx-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">Start {periodName} {currentPeriod + 1}?</h3>
            <p className="text-sm text-gray-400 mb-4">
              The timer will reset to 00:00.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPeriodConfirm(false)}
                className="flex-1 py-3 border border-surface-600 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmAdvancePeriod}
                className="flex-1 py-3 bg-accent rounded-lg text-sm font-bold"
              >
                Next {periodName}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End of regulation options — End Game / Extra Time / Overtime / Penalties */}
      {showEndOptions && sport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowEndOptions(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-surface-800 rounded-2xl p-6 mx-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1">
              {isExtraPeriod ? `End of ${extraPeriodLabel}` : `End of ${periodName} ${currentPeriod}`}
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              {game.home_team} {game.home_score} - {game.away_score} {game.away_team}
            </p>
            <div className="space-y-2">
              {sport.extraPeriods.map((ep) => (
                <button
                  key={ep.type}
                  onClick={() => {
                    setShowEndOptions(false);
                    setExtraPeriodLabel(ep.label);
                    advancePeriod();
                    timer.reset();
                  }}
                  className="w-full py-3 bg-surface-700 rounded-lg text-sm font-semibold active:bg-surface-600"
                >
                  {ep.label}
                </button>
              ))}
              <button
                onClick={() => { setShowEndOptions(false); setShowEndConfirm(true); }}
                className="w-full py-3 bg-accent rounded-lg text-sm font-bold"
              >
                End Game
              </button>
              <button
                onClick={() => setShowEndOptions(false)}
                className="w-full py-3 text-center text-sm text-gray-500"
              >
                Continue Playing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End game final confirmation */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowEndConfirm(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-surface-800 rounded-2xl p-6 mx-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">End Game?</h3>
            <p className="text-sm text-gray-400 mb-4">
              Final score: {game.home_team} {game.home_score} - {game.away_score} {game.away_team}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 py-3 border border-surface-600 rounded-lg text-sm font-medium"
              >
                Cancel
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
