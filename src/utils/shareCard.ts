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
  leader: Team | null; // who is ahead — live or final; null when scores are level
  isDraw: boolean;
  resultLabel: string; // bottom-right caption ("Coolera by 3", "Coolera lead by 3", "Scores level"…)
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
  const leader: Team | null =
    game.home_score > game.away_score ? 'home' : game.away_score > game.home_score ? 'away' : null;
  const isDraw = !isLive && leader === null;
  const margin = Math.abs(game.home_score - game.away_score);

  const leaderName = leader === 'home' ? game.home_team : leader === 'away' ? game.away_team : '';
  const resultLabel =
    leader === null
      ? isLive
        ? 'Scores level'
        : 'Full-time draw'
      : `${leaderName} ${isLive ? 'lead by' : 'by'} ${margin}`;

  return {
    sport: sport.name,
    sportIcon: sport.icon,
    isLive,
    statusLabel: isLive ? (opts.periodLabel ?? '') : isDraw ? 'DRAW' : 'FULL TIME',
    dateLabel: formatDate(game.started_at),
    // isWinner is the settled full-time winner (drives the "· Win" badge); leader covers the live case.
    home: { name: game.home_team, score: scoreFor(game, events, sport, 'home'), side: 'home', isWinner: !isLive && leader === 'home' },
    away: { name: game.away_team, score: scoreFor(game, events, sport, 'away'), side: 'away', isWinner: !isLive && leader === 'away' },
    leader,
    isDraw,
    resultLabel,
    appName: "Jonathan's Score Keeper",
    appUrl: 'runthehill.github.io/score-keeper',
  };
}

// Build a download-safe filename from two team names (collapses any run of
// characters that aren't filesystem-safe — "/", ":", "?", etc. — to a dash).
export function shareFilename(home: string, away: string): string {
  return `${home}-v-${away}`.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '.png';
}
