import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import type { Team } from '../types';
import { getSportConfig } from '../sports/configs';
import { useGame } from '../hooks/useGame';
import { useDB } from '../hooks/useDB';
import ClockEditModal from '../components/ClockEditModal';
import { endGame, updateGameTeamNames, updateGameColors, updatePlayer, updatePlayerOrder, insertPlayer } from '../db/queries';
import Scoreboard from '../components/Scoreboard';
import ScoringRow from '../components/ScoringRow';
import Timer from '../components/Timer';
import EventLog from '../components/EventLog';
import ActionsRow from '../components/ActionsRow';
import PlayerPicker from '../components/PlayerPicker';
import SubstitutionFlow from '../components/SubstitutionFlow';
import ShareSheet from '../components/ShareSheet';
import EditGameSheet from '../components/EditGameSheet';
import TeamKitChip from '../components/TeamKitChip';
import { ChevronLeft, Edit } from '../components/icons';

export default function LiveGame() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { db, persist } = useDB();
  const {
    game, events, players, currentPeriod, periodCount, periodName, periodLengthMinutes,
    currentPeriodLabel, addEvent, undoLastEvent, advancePeriod, substitute, reload,
    liveSeconds, clockRunning, clockIsOvertime, toggleClock, setClockSeconds,
  } = useGame(gameId!);

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
  const [showClockEdit, setShowClockEdit] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [flash, setFlash] = useState<Team | null>(null);

  // Wake lock — keep screen on while scoring
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch {
        // Wake Lock API unavailable or request denied — non-critical, ignore.
      }
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

  const triggerFlash = useCallback((team: Team) => {
    setFlash(team);
    setTimeout(() => setFlash((f) => (f === team ? null : f)), 450);
  }, []);

  const handleScore = useCallback(
    (team: Team, eventType: string, points: number) => {
      if (points > 0) triggerFlash(team);
      if (teamHasPlayers(team)) {
        setPendingScore({ team, eventType, points });
      } else {
        addEvent(team, eventType, points);
      }
    },
    [teamHasPlayers, addEvent, triggerFlash]
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
    advancePeriod(null);
    setShowPeriodConfirm(false);
  }, [advancePeriod]);

  const handleEndGame = useCallback(() => {
    endGame(db, gameId!, new Date().toISOString());
    persist();
    navigate(`/summary/${gameId}`, { replace: true });
  }, [db, gameId, persist, navigate]);

  const handleSaveEdit = useCallback(
    (data: {
      homeTeam: string; awayTeam: string;
      homeKit: { primary: string; secondary: string };
      awayKit: { primary: string; secondary: string };
      homeRows: { id?: string; name: string; number: string }[];
      awayRows: { id?: string; name: string; number: string }[];
    }) => {
      updateGameTeamNames(db, gameId!, data.homeTeam, data.awayTeam);
      updateGameColors(db, gameId!, {
        home_primary: data.homeKit.primary, home_secondary: data.homeKit.secondary,
        away_primary: data.awayKit.primary, away_secondary: data.awayKit.secondary,
      });
      const applyRows = (rows: { id?: string; name: string; number: string }[], team: Team) => {
        rows.filter((r) => r.name.trim()).forEach((r, i) => {
          const number = r.number ? parseInt(r.number, 10) : null;
          if (r.id) {
            updatePlayer(db, r.id, { name: r.name.trim(), number });
            updatePlayerOrder(db, r.id, i);
          } else {
            insertPlayer(db, { id: uuid(), game_id: gameId!, team, name: r.name.trim(), number, status: 'active', sort_order: i });
          }
        });
      };
      applyRows(data.homeRows, 'home');
      applyRows(data.awayRows, 'away');
      persist();
      reload();
      setShowEdit(false);
    },
    [db, gameId, persist, reload]
  );

  if (!game || !sport) {
    return <div className="p-4 text-txt-3">Loading game...</div>;
  }

  // Determine which pending action needs a player picker
  const pendingAction = pendingScore || pendingStatTeam || pendingCard;
  const pendingTeam = pendingScore?.team ?? pendingStatTeam?.team ?? pendingCard?.team;
  const pendingTitle = pendingScore
    ? (pendingScore.eventType.endsWith('_miss')
        ? 'Who missed?'
        : `${pendingScore.points > 0 ? 'Who scored' : 'Who hit'} the ${pendingScore.eventType.replace(/_/g, ' ')}?`)
    : pendingCard
      ? `Who received the card?`
      : 'Which player?';

  return (
    <div className="p-3 space-y-3 pb-8">
      {/* Sport badge + period */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Back to home"
            className="w-8 h-8 shrink-0 grid place-items-center rounded-full bg-surface-2 border border-line text-txt press"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="bg-surface-2 border border-line text-txt-2 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-[0.06em]">
            {sport.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-txt-3">
            {currentPeriodLabel ? currentPeriodLabel : `${periodName} ${currentPeriod} of ${periodCount}`}
          </span>
          <button
            type="button"
            onClick={() => setShowEdit(true)}
            aria-label="Edit game"
            className="w-8 h-8 shrink-0 grid place-items-center rounded-full bg-surface-2 border border-line text-txt press"
          >
            <Edit size={15} />
          </button>
        </div>
      </div>

      {/* Scoreboard */}
      <Scoreboard game={game} events={events} flash={flash} />

      <button
        onClick={() => setShowShare(true)}
        className="w-full py-2 text-center text-xs font-semibold text-txt-3 border border-line rounded-xl press"
      >
        Share current score
      </button>

      {showShare && (
        <ShareSheet
          game={game}
          events={events}
          sport={sport}
          variant="live"
          periodLabel={currentPeriodLabel ?? `${periodName} ${currentPeriod}`}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* Basketball team fouls */}
      {teamFouls && (
        <div className="flex justify-between px-4 text-xs">
          <span className={`font-semibold ${teamFouls.home >= 5 ? 'text-danger' : 'text-txt-3'}`}>
            Team Fouls: {teamFouls.home}{teamFouls.home >= 5 ? ' BONUS' : ''}
          </span>
          <span className={`font-semibold ${teamFouls.away >= 5 ? 'text-danger' : 'text-txt-3'}`}>
            Team Fouls: {teamFouls.away}{teamFouls.away >= 5 ? ' BONUS' : ''}
          </span>
        </div>
      )}

      {/* Timer */}
      <Timer
        seconds={liveSeconds}
        running={clockRunning}
        overtime={clockIsOvertime}
        onToggle={toggleClock}
        onEdit={() => setShowClockEdit(true)}
        periodLabel={currentPeriodLabel ?? `${periodName} ${currentPeriod}`}
      />

      {/* Home scoring */}
      <ScoringRow
        events={sport.scoringEvents}
        team="home"
        teamName={game.home_team}
        primary={game.home_primary}
        secondary={game.home_secondary}
        score={game.home_score}
        isSplit={sport.scoreDisplay === 'split'}
        gameEvents={events}
        onScore={(type, pts) => handleScore('home', type, pts)}
        onMiss={(missType) => handleScore('home', missType, 0)}
      />

      {/* Away scoring */}
      <ScoringRow
        events={sport.scoringEvents}
        team="away"
        teamName={game.away_team}
        primary={game.away_primary}
        secondary={game.away_secondary}
        score={game.away_score}
        isSplit={sport.scoreDisplay === 'split'}
        gameEvents={events}
        onScore={(type, pts) => handleScore('away', type, pts)}
        onMiss={(missType) => handleScore('away', missType, 0)}
      />

      {/* Actions */}
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
        extraPeriodLabel={currentPeriodLabel}
      />

      {/* Event log */}
      <EventLog events={events} players={players} game={game} gameStartedAt={game.started_at} />

      {/* End game */}
      <button
        onClick={() => setShowEndOptions(true)}
        className="w-full py-3 text-center text-sm text-txt-3 border border-line rounded-xl press"
      >
        End Game
      </button>

      {/* Player picker (unchanged) */}
      {pendingAction && pendingTeam && teamHasPlayers(pendingTeam) && (
        <PlayerPicker
          players={players.filter((p) => p.team === pendingTeam)}
          title={pendingTitle}
          onSelect={handlePlayerSelected}
          onSkip={handleSkipPlayer}
          onClose={() => { setPendingScore(null); setPendingStatTeam(null); setPendingCard(null); }}
        />
      )}

      {/* Substitution (unchanged) */}
      {showSub && (
        <SubstitutionFlow
          homePlayers={homePlayers}
          awayPlayers={awayPlayers}
          homeTeamName={game.home_team}
          awayTeamName={game.away_team}
          homePrimary={game.home_primary}
          homeSecondary={game.home_secondary}
          awayPrimary={game.away_primary}
          awaySecondary={game.away_secondary}
          onSubstitute={substitute}
          onClose={() => setShowSub(false)}
        />
      )}

      {/* Card picker */}
      {showCardPicker && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowCardPicker(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full bg-surface rounded-t-2xl border-t border-line p-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-txt-3 mb-3">Issue Card</p>
            <div className="space-y-2">
              {sport.cardEvents.map((card) => (
                <div key={card.type} className="flex gap-2">
                  <button
                    onClick={() => handleCardTeamSelected('home', card.type)}
                    className="flex-1 flex items-center gap-2 bg-surface-2 border border-line rounded-xl py-3 px-3 text-sm font-semibold text-txt press"
                  >
                    <TeamKitChip primary={game.home_primary} secondary={game.home_secondary} size={18} radius={5} />
                    <span style={{ color: card.color }} aria-hidden="true">●</span> {card.label} — {game.home_team}
                  </button>
                  <button
                    onClick={() => handleCardTeamSelected('away', card.type)}
                    className="flex-1 flex items-center gap-2 bg-surface-2 border border-line rounded-xl py-3 px-3 text-sm font-semibold text-txt press"
                  >
                    <TeamKitChip primary={game.away_primary} secondary={game.away_secondary} size={18} radius={5} />
                    <span style={{ color: card.color }} aria-hidden="true">●</span> {card.label} — {game.away_team}
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setShowCardPicker(false)} className="w-full mt-3 py-3 text-center text-sm text-txt-3">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stat team picker */}
      {showStatTeamPicker && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowStatTeamPicker(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full bg-surface rounded-t-2xl border-t border-line p-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-txt-3 mb-3">Which team?</p>
            <div className="space-y-2">
              <button
                onClick={() => handleStatTeamSelected('home', showStatTeamPicker)}
                className="w-full flex items-center gap-2.5 bg-surface-2 border border-line rounded-xl py-3 px-3 font-semibold text-txt press"
              >
                <TeamKitChip primary={game.home_primary} secondary={game.home_secondary} size={20} radius={6} />
                {game.home_team}
              </button>
              <button
                onClick={() => handleStatTeamSelected('away', showStatTeamPicker)}
                className="w-full flex items-center gap-2.5 bg-surface-2 border border-line rounded-xl py-3 px-3 font-semibold text-txt press"
              >
                <TeamKitChip primary={game.away_primary} secondary={game.away_secondary} size={20} radius={6} />
                {game.away_team}
              </button>
            </div>
            <button onClick={() => setShowStatTeamPicker(null)} className="w-full mt-3 py-3 text-center text-sm text-txt-3">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Period advance confirm */}
      {showPeriodConfirm && sport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowPeriodConfirm(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-surface rounded-2xl border border-line p-6 mx-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold mb-2 text-txt">Start {periodName} {currentPeriod + 1}?</h3>
            <p className="text-sm text-txt-3 mb-4">{periodLengthMinutes ? `The clock continues into ${periodName} ${currentPeriod + 1}.` : 'The timer will reset to 00:00.'}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowPeriodConfirm(false)} className="flex-1 py-3 border border-line rounded-xl text-sm font-medium text-txt-2 press">Cancel</button>
              <button onClick={confirmAdvancePeriod} className="flex-1 py-3 bg-txt text-bg rounded-xl text-sm font-bold press">Next {periodName}</button>
            </div>
          </div>
        </div>
      )}

      {/* End-of-regulation options */}
      {showEndOptions && sport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowEndOptions(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-surface rounded-2xl border border-line p-6 mx-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold mb-1 text-txt">
              {isExtraPeriod ? `End of ${currentPeriodLabel ?? `${periodName} ${currentPeriod}`}` : `End of ${periodName} ${currentPeriod}`}
            </h3>
            <p className="text-sm text-txt-3 mb-4">
              {game.home_team} {game.home_score} - {game.away_score} {game.away_team}
            </p>
            <div className="space-y-2">
              {sport.extraPeriods.map((ep) => (
                <button
                  key={ep.type}
                  onClick={() => { setShowEndOptions(false); advancePeriod(ep.label); }}
                  className="w-full py-3 bg-surface-2 border border-line rounded-xl text-sm font-semibold text-txt press"
                >
                  {ep.label}
                </button>
              ))}
              <button onClick={() => { setShowEndOptions(false); setShowEndConfirm(true); }} className="w-full py-3 bg-txt text-bg rounded-xl text-sm font-bold press">
                End Game
              </button>
              <button onClick={() => setShowEndOptions(false)} className="w-full py-3 text-center text-sm text-txt-3">
                Continue Playing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End-game confirm */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowEndConfirm(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-surface rounded-2xl border border-line p-6 mx-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold mb-2 text-txt">End Game?</h3>
            <p className="text-sm text-txt-3 mb-4">
              Final score: {game.home_team} {game.home_score} - {game.away_score} {game.away_team}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowEndConfirm(false)} className="flex-1 py-3 border border-line rounded-xl text-sm font-medium text-txt-2 press">Cancel</button>
              <button onClick={handleEndGame} className="flex-1 py-3 bg-txt text-bg rounded-xl text-sm font-bold press">End Game</button>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <EditGameSheet
          game={game}
          players={players}
          onSave={handleSaveEdit}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showClockEdit && (
        <ClockEditModal
          initialSeconds={liveSeconds}
          onSet={setClockSeconds}
          onClose={() => setShowClockEdit(false)}
        />
      )}
    </div>
  );
}
