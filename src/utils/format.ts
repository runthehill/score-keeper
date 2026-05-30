import type { GameEvent, ScoreDisplay, Team } from '../types';

export function formatScore(display: ScoreDisplay, totalPoints: number, events: Pick<GameEvent, 'event_type' | 'team' | 'points'>[], team?: Team): string {
  if (display === 'split' && team) {
    return formatGaelicScore(events, team);
  }
  return String(totalPoints);
}

export function formatGaelicScore(events: Pick<GameEvent, 'event_type' | 'team' | 'points'>[], team: Team): string {
  const teamEvents = events.filter((e) => e.team === team);
  const goals = teamEvents.filter((e) => e.event_type === 'goal').length;
  const points = teamEvents
    .filter((e) => e.event_type !== 'goal')
    .reduce((sum, e) => sum + e.points, 0);
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

export function formatRelativeDay(iso: string): string {
  const then = new Date(iso);
  const days = Math.floor((Date.now() - then.getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
