export type Sport = 'rugby_union' | 'soccer' | 'gaelic_football' | 'basketball' | 'hurling' | 'camogie';
export type Team = 'home' | 'away';
export type GameStatus = 'in_progress' | 'completed';
export type PlayerStatus = 'active' | 'bench' | 'subbed_off';
export type ScoreDisplay = 'single' | 'split';

export interface Game {
  id: string;
  sport: Sport;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  status: GameStatus;
  started_at: string;
  ended_at: string | null;
  notes: string;
  home_primary: string;
  home_secondary: string;
  away_primary: string;
  away_secondary: string;
  clock_running?: number;
  clock_base_ms?: number;
  clock_anchor?: string | null;
  clock_active?: number;
  current_period?: number;
  current_period_label?: string | null;
}

export interface Player {
  id: string;
  game_id: string;
  team: Team;
  name: string;
  number: number | null;
  status: PlayerStatus;
  sort_order?: number;
}

export interface GameEvent {
  id: string;
  game_id: string;
  player_id: string | null;
  team: Team;
  event_type: string;
  points: number;
  half_or_period: number;
  timestamp: string;
  clock_seconds?: number | null;
}

export interface ScoringEventConfig {
  type: string;
  label: string;
  points: number;
  icon: string;
  color?: string;
  miss?: { type: string; label: string };
}

export interface StatEventConfig {
  type: string;
  label: string;
  icon: string;
}

export interface CardEventConfig {
  type: string;
  label: string;
  color: string;
}

export interface DefaultSquadPlayer {
  name: string;
  number: string;
}

export interface DefaultSquad {
  teamName: string;
  players: DefaultSquadPlayer[];
  primary?: string;
  secondary?: string;
}

export interface SavedTeamPlayer {
  name: string;
  number: string;
}

export interface SavedTeam {
  id: string;
  teamName: string;
  players: SavedTeamPlayer[];
  primary?: string;
  secondary?: string;
}

export interface PeriodConfig {
  count: number;
  name: string;
}

export interface ExtraPeriodConfig {
  type: 'extra_time' | 'overtime' | 'penalties';
  label: string;
}

export interface GameMetadata {
  periodCount?: number;
  periodName?: string;
  periodLengthMinutes?: number;
}

export interface SportConfig {
  id: Sport;
  name: string;
  icon: string;
  periods: PeriodConfig;
  periodOptions?: PeriodConfig[];
  extraPeriods: ExtraPeriodConfig[];
  scoreDisplay: ScoreDisplay;
  scoringEvents: ScoringEventConfig[];
  statEvents: StatEventConfig[];
  cardEvents: CardEventConfig[];
}
