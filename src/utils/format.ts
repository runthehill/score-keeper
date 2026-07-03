import type { GameEvent, ScoreDisplay, SportConfig, Team } from '../types';

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

export function runningTally(
  events: Pick<GameEvent, 'event_type' | 'team' | 'points'>[],
  isSplit: boolean,
): { home: string; away: string }[] {
  if (isSplit) {
    // Gaelic: each row shows the goals-points scoreline so far for both teams.
    return events.map((_event, i) => {
      const soFar = events.slice(0, i + 1);
      return { home: formatGaelicScore(soFar, 'home'), away: formatGaelicScore(soFar, 'away') };
    });
  }
  // Other sports: a cumulative point total per team.
  let homeTotal = 0;
  let awayTotal = 0;
  return events.map((e) => {
    if (e.team === 'home') homeTotal += e.points;
    else awayTotal += e.points;
    return { home: String(homeTotal), away: String(awayTotal) };
  });
}

export function eventLabel(sport: SportConfig, type: string): string {
  const scoring = sport.scoringEvents.find((e) => e.type === type);
  if (scoring) return scoring.label;
  const miss = sport.scoringEvents.find((e) => e.miss?.type === type)?.miss;
  if (miss) return miss.label;
  const stat = sport.statEvents.find((e) => e.type === type);
  if (stat) return stat.label;
  const card = sport.cardEvents.find((e) => e.type === type);
  if (card) return card.label;
  const words = type.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
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
