import type { Game, GameEvent, SportConfig, Team } from '../types';
import { formatGaelicScore } from './format';

export type ShareVariant = 'live' | 'final';

export interface ShareTeam {
  name: string;
  score: string;
  side: Team;
  isWinner: boolean;
}

export interface ShareModel {
  sport: string;
  sportIcon: string;
  isLive: boolean;
  statusLabel: string;
  dateLabel: string;
  home: ShareTeam;
  away: ShareTeam;
  isDraw: boolean;
  appName: string;
  appUrl: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Format the UTC calendar date of an ISO timestamp as "29 May 2026" (deterministic across timezones).
function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function scoreFor(
  game: Game,
  events: Pick<GameEvent, 'event_type' | 'team' | 'points'>[],
  sport: SportConfig,
  side: Team
): string {
  if (sport.scoreDisplay === 'split') return formatGaelicScore(events, side);
  return String(side === 'home' ? game.home_score : game.away_score);
}

export function buildShareModel(
  game: Game,
  events: Pick<GameEvent, 'event_type' | 'team' | 'points'>[],
  sport: SportConfig,
  opts: { variant: ShareVariant; periodLabel?: string }
): ShareModel {
  const isLive = opts.variant === 'live';
  const isDraw = !isLive && game.home_score === game.away_score;
  const homeWins = !isLive && game.home_score > game.away_score;
  const awayWins = !isLive && game.away_score > game.home_score;

  return {
    sport: sport.name,
    sportIcon: sport.icon,
    isLive,
    statusLabel: isLive ? (opts.periodLabel ?? '') : isDraw ? 'DRAW' : 'FULL TIME',
    dateLabel: formatDate(game.started_at),
    home: { name: game.home_team, score: scoreFor(game, events, sport, 'home'), side: 'home', isWinner: homeWins },
    away: { name: game.away_team, score: scoreFor(game, events, sport, 'away'), side: 'away', isWinner: awayWins },
    isDraw,
    appName: "Jonathan's Score Keeper",
    appUrl: 'runthehill.github.io/score-keeper',
  };
}
