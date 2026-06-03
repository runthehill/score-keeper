import { useState, useCallback, useEffect, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import type { Game, GameEvent, GameMetadata, Player, Team } from '../types';
import { getSportConfig } from '../sports/configs';
import { useDB } from './useDB';
import {
  getGame,
  insertEvent,
  listEvents,
  deleteEvent,
  getLastEvent,
  updateGameScore,
  listPlayers,
  updatePlayerStatus,
  updateClock,
} from '../db/queries';
import {
  clockSeconds as computeClockSeconds, isOvertime as computeIsOvertime,
  computeToggle, computeStart, computePause, computeSetTime, computeNextPeriod,
  type ClockState,
} from '../utils/clock';

function parseMetadata(game: Game): GameMetadata {
  if (!game.notes) return {};
  try { return JSON.parse(game.notes) as GameMetadata; } catch { return {}; }
}

function toClockState(g: Game): ClockState {
  return {
    clock_running: g.clock_running ?? 0,
    clock_base_ms: g.clock_base_ms ?? 0,
    clock_anchor: g.clock_anchor ?? null,
    clock_active: g.clock_active ?? 0,
  };
}

export function useGame(gameId: string) {
  const { db, persist } = useDB();
  const [game, setGame] = useState<Game | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState(1);

  const sport = game ? getSportConfig(game.sport) : null;
  const metadata = useMemo(() => game ? parseMetadata(game) : {}, [game]);
  const periodCount = metadata.periodCount ?? sport?.periods.count ?? 2;
  const periodName = metadata.periodName ?? sport?.periods.name ?? 'Half';
  const periodLengthMinutes = metadata.periodLengthMinutes ?? null;

  const reload = useCallback(() => {
    const g = getGame(db, gameId);
    if (g) {
      setGame(g);
      const evts = listEvents(db, gameId);
      setEvents(evts);
      setPlayers(listPlayers(db, gameId));
      // Effective period = the later of the persisted period and the furthest period
      // any event reached. This keeps a started-but-scoreless period (persisted) and
      // also restores the period for games saved before current_period existed (their
      // migrated column defaults to 1 even though events may be in a later half).
      const maxEventPeriod = evts.length > 0 ? Math.max(...evts.map((e) => e.half_or_period)) : 1;
      setCurrentPeriod(Math.max(g.current_period ?? 1, maxEventPeriod));
    }
  }, [db, gameId]);

  useEffect(() => {
    // reload() re-syncs React state from the SQLite store on mount and whenever
    // db/gameId change (e.g. switching games without remounting). This is the
    // intended "subscribe to an external system" effect — the synchronous setState
    // inside reload is deliberate (the DB read is synchronous) and must remain.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  // 1-second display tick — only active while the clock is running.
  // We store the timestamp in state so render reads a pure (state-derived) value.
  const [nowMs, setNowMs] = useState(() => Date.now());
  const running = !!game?.clock_running;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  // Live display values — recomputed each render (driven by the tick above)
  const clockState = game ? toClockState(game) : { clock_running: 0, clock_base_ms: 0, clock_anchor: null, clock_active: 0 };
  const liveSeconds = computeClockSeconds(clockState, nowMs);
  const clockIsOvertime = game ? computeIsOvertime(clockState, nowMs, currentPeriod, periodLengthMinutes, periodCount) : false;
  const clockActive = !!clockState.clock_active;
  const currentPeriodLabel = game?.current_period_label ?? null;

  const recalcScore = useCallback(() => {
    const evts = listEvents(db, gameId);
    const homeScore = evts.filter((e) => e.team === 'home').reduce((s, e) => s + e.points, 0);
    const awayScore = evts.filter((e) => e.team === 'away').reduce((s, e) => s + e.points, 0);
    updateGameScore(db, gameId, homeScore, awayScore);
    persist();
  }, [db, gameId, persist]);

  // Clock action dispatcher
  const applyClockTransition = useCallback(
    (fn: (state: ClockState, now: number) => Parameters<typeof updateClock>[2]) => {
      const g = getGame(db, gameId);
      if (!g) return;
      updateClock(db, gameId, fn(toClockState(g), Date.now()));
      persist();
      reload();
    },
    [db, gameId, persist, reload]
  );

  const toggleClock = useCallback(() => applyClockTransition(computeToggle), [applyClockTransition]);
  const startClock = useCallback(() => applyClockTransition(computeStart), [applyClockTransition]);
  const pauseClock = useCallback(() => applyClockTransition(computePause), [applyClockTransition]);
  const setClockSeconds = useCallback(
    (seconds: number) => applyClockTransition((state, now) => computeSetTime(state, seconds, now)),
    [applyClockTransition]
  );

  // Snapshot the current clock position when recording an event
  const snapshotClockSeconds = useCallback((): number | null => {
    const g = getGame(db, gameId);
    if (!g) return null;
    const state = toClockState(g);
    return state.clock_active ? computeClockSeconds(state, Date.now()) : null;
  }, [db, gameId]);

  const addEvent = useCallback(
    (team: Team, eventType: string, points: number, playerId?: string) => {
      const event: GameEvent = {
        id: uuid(),
        game_id: gameId,
        player_id: playerId ?? null,
        team,
        event_type: eventType,
        points,
        half_or_period: currentPeriod,
        timestamp: new Date().toISOString(),
        clock_seconds: snapshotClockSeconds(),
      };
      insertEvent(db, event);
      recalcScore();
      reload();
    },
    [db, gameId, currentPeriod, recalcScore, reload, snapshotClockSeconds]
  );

  const undoLastEvent = useCallback(() => {
    const last = getLastEvent(db, gameId);
    if (last) {
      deleteEvent(db, last.id);
      recalcScore();
      reload();
    }
  }, [db, gameId, recalcScore, reload]);

  const advancePeriod = useCallback(
    (label: string | null = null) => {
      const g = getGame(db, gameId);
      if (!g) return;
      const meta = parseMetadata(g);
      const cfg = getSportConfig(g.sport);
      const len = meta.periodLengthMinutes ?? null;
      const count = meta.periodCount ?? cfg.periods.count;
      const newPeriod = (g.current_period ?? 1) + 1;
      updateClock(db, gameId, computeNextPeriod(newPeriod, len, count, label));
      persist();
      reload();
    },
    [db, gameId, persist, reload]
  );

  const substitute = useCallback(
    (team: Team, offPlayerId: string, onPlayerId: string) => {
      const cs = snapshotClockSeconds();
      const now = new Date().toISOString();
      const offEvent: GameEvent = {
        id: uuid(),
        game_id: gameId,
        player_id: offPlayerId,
        team,
        event_type: 'substitution_off',
        points: 0,
        half_or_period: currentPeriod,
        timestamp: now,
        clock_seconds: cs,
      };
      const onEvent: GameEvent = {
        id: uuid(),
        game_id: gameId,
        player_id: onPlayerId,
        team,
        event_type: 'substitution_on',
        points: 0,
        half_or_period: currentPeriod,
        timestamp: now,
        clock_seconds: cs,
      };
      insertEvent(db, offEvent);
      insertEvent(db, onEvent);
      updatePlayerStatus(db, offPlayerId, 'subbed_off');
      updatePlayerStatus(db, onPlayerId, 'active');
      persist();
      reload();
    },
    [db, gameId, currentPeriod, persist, reload, snapshotClockSeconds]
  );

  return {
    game,
    events,
    players,
    currentPeriod,
    periodCount,
    periodName,
    addEvent,
    undoLastEvent,
    advancePeriod,
    substitute,
    reload,
    liveSeconds,
    clockRunning: running,
    clockActive,
    clockIsOvertime,
    currentPeriodLabel,
    periodLengthMinutes,
    toggleClock,
    startClock,
    pauseClock,
    setClockSeconds,
  };
}
