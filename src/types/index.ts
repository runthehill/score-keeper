export type Sport = 'rugby_union' | 'soccer' | 'gaelic_football' | 'basketball';
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
}

export interface Player {
  id: string;
  game_id: string;
  team: Team;
  name: string;
  number: number | null;
  status: PlayerStatus;
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
}

export interface ScoringEventConfig {
  type: string;
  label: string;
  points: number;
  icon: string;
  color?: string;
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
}

export interface SportConfig {
  id: Sport;
  name: string;
  icon: string;
  defaultTeamName: string;
  periods: PeriodConfig;
  periodOptions?: PeriodConfig[];
  extraPeriods: ExtraPeriodConfig[];
  scoreDisplay: ScoreDisplay;
  scoringEvents: ScoringEventConfig[];
  statEvents: StatEventConfig[];
  cardEvents: CardEventConfig[];
}
