import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Game, GameEvent } from '../types';
import { listEvents } from '../db/queries';
import GameCard from './GameCard';

vi.mock('../hooks/useDB', () => ({ useDB: () => ({ db: {}, persist: vi.fn() }) }));
vi.mock('../hooks/useTheme', () => ({ useThemeContext: () => ({ dark: true, toggle: vi.fn() }) }));
vi.mock('../db/queries', () => ({ listEvents: vi.fn(() => []) }));

const mockListEvents = vi.mocked(listEvents);

function game(overrides: Partial<Game> = {}): Game {
  return {
    id: 'g1', sport: 'gaelic_football', home_team: 'Coolera', away_team: 'Tourlestrane',
    home_score: 4, away_score: 0, status: 'completed',
    started_at: '2026-05-30T10:00:00.000Z', ended_at: '2026-05-30T11:00:00.000Z', notes: '',
    home_primary: '#E03131', home_secondary: '#FFFFFF', away_primary: '#1E63D6', away_secondary: '#FFFFFF',
    ...overrides,
  };
}

const renderCard = (g: Game) => render(<MemoryRouter><GameCard game={g} /></MemoryRouter>);

describe('GameCard', () => {
  beforeEach(() => {
    mockListEvents.mockReset();
    mockListEvents.mockReturnValue([]);
  });

  it('shows the Gaelic goals-points score (G-PP), not the points total', () => {
    const events: GameEvent[] = [
      { id: 'e1', game_id: 'g1', player_id: null, team: 'home', event_type: 'goal', points: 3, half_or_period: 1, timestamp: '2026-05-30T10:05:00.000Z' },
      { id: 'e2', game_id: 'g1', player_id: null, team: 'home', event_type: 'point', points: 1, half_or_period: 1, timestamp: '2026-05-30T10:06:00.000Z' },
    ];
    mockListEvents.mockReturnValue(events);
    renderCard(game());
    expect(screen.getByText('1-01')).toBeInTheDocument(); // 1 goal, 1 point
    expect(screen.queryByText('4')).not.toBeInTheDocument(); // not the raw 4-point total
  });

  it('shows the integer total for single-score sports (and skips the events query)', () => {
    renderCard(game({ sport: 'rugby_union', home_score: 12, away_score: 7 }));
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(mockListEvents).not.toHaveBeenCalled();
  });
});
