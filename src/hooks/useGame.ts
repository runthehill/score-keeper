import { useState, useCallback, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import type { Game, GameEvent, Player, Team } from '../types';
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
} from '../db/queries';

export function useGame(gameId: string) {
  const { db, persist } = useDB();
  const [game, setGame] = useState<Game | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState(1);

  const reload = useCallback(() => {
    const g = getGame(db, gameId);
    if (g) {
      setGame(g);
      setEvents(listEvents(db, gameId));
      setPlayers(listPlayers(db, gameId));
    }
  }, [db, gameId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const recalcScore = useCallback(() => {
    const evts = listEvents(db, gameId);
    const homeScore = evts.filter((e) => e.team === 'home').reduce((s, e) => s + e.points, 0);
    const awayScore = evts.filter((e) => e.team === 'away').reduce((s, e) => s + e.points, 0);
    updateGameScore(db, gameId, homeScore, awayScore);
    persist();
  }, [db, gameId, persist]);

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
      };
      insertEvent(db, event);
      recalcScore();
      reload();
    },
    [db, gameId, currentPeriod, recalcScore, reload]
  );

  const undoLastEvent = useCallback(() => {
    const last = getLastEvent(db, gameId);
    if (last) {
      deleteEvent(db, last.id);
      recalcScore();
      reload();
    }
  }, [db, gameId, recalcScore, reload]);

  const advancePeriod = useCallback(() => {
    setCurrentPeriod((p) => p + 1);
  }, []);

  const substitute = useCallback(
    (team: Team, offPlayerId: string, onPlayerId: string) => {
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
      };
      insertEvent(db, offEvent);
      insertEvent(db, onEvent);
      updatePlayerStatus(db, offPlayerId, 'subbed_off');
      updatePlayerStatus(db, onPlayerId, 'active');
      persist();
      reload();
    },
    [db, gameId, currentPeriod, persist, reload]
  );

  return {
    game,
    events,
    players,
    currentPeriod,
    addEvent,
    undoLastEvent,
    advancePeriod,
    substitute,
    reload,
  };
}
