import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Scoreboard from './Scoreboard';
import type { Game, GameEvent } from '../types';

function game(overrides: Partial<Game> = {}): Game {
  return {
    id: 'g1', sport: 'rugby_union', home_team: 'Sligo RFC', away_team: 'Ballina',
    home_score: 12, away_score: 7, status: 'in_progress',
    started_at: '2026-05-30T10:00:00.000Z', ended_at: null, notes: '',
    home_primary: '#15171C', home_secondary: '#FFFFFF',
    away_primary: '#1E63D6', away_secondary: '#FFFFFF',
    ...overrides,
  };
}

describe('Scoreboard (blocks)', () => {
  it('shows both team names and single-number scores', () => {
    render(<Scoreboard game={game()} events={[]} />);
    expect(screen.getByText('Sligo RFC')).toBeInTheDocument();
    expect(screen.getByText('Ballina')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders the Gaelic split score (G-PP) for split sports', () => {
    const events: GameEvent[] = [
      { id: 'e1', game_id: 'g1', player_id: null, team: 'home', event_type: 'goal', points: 3, half_or_period: 1, timestamp: '2026-05-30T10:05:00.000Z' },
      { id: 'e2', game_id: 'g1', player_id: null, team: 'home', event_type: 'point', points: 1, half_or_period: 1, timestamp: '2026-05-30T10:06:00.000Z' },
    ];
    render(<Scoreboard game={game({ sport: 'gaelic_football', home_score: 4, away_score: 0 })} events={events} />);
    expect(screen.getByText('1-01')).toBeInTheDocument();
  });
});
