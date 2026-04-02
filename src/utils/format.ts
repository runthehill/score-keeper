import { GameEvent, ScoreDisplay, Team } from '../types';

export function formatScore(display: ScoreDisplay, totalPoints: number, events: Pick<GameEvent, 'event_type' | 'team'>[], team?: Team): string {
  if (display === 'split' && team) {
    return formatGaelicScore(events, team);
  }
  return String(totalPoints);
}

export function formatGaelicScore(events: Pick<GameEvent, 'event_type' | 'team'>[], team: Team): string {
  const teamEvents = events.filter((e) => e.team === team);
  const goals = teamEvents.filter((e) => e.event_type === 'goal').length;
  const points = teamEvents.filter((e) => e.event_type === 'point').length;
  return `${goals}-${String(points).padStart(2, '0')}`;
}

export function formatTimer(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatEventTime(eventTimestamp: string, gameStartTimestamp: string): string {
  const diff = Math.floor((new Date(eventTimestamp).getTime() - new Date(gameStartTimestamp).getTime()) / 1000);
  return formatTimer(Math.max(0, diff));
}
