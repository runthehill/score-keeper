import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EventLog from './EventLog';
import type { Game, GameEvent } from '../types';

// Match the project convention (see GameCard.test.tsx): mock the theme hook rather than wrap a provider.
vi.mock('../hooks/useTheme', () => ({ useThemeContext: () => ({ dark: true, toggle: vi.fn() }) }));

const game: Game = {
  id: 'g1', sport: 'soccer', home_team: 'A', away_team: 'B', home_score: 1, away_score: 0,
  status: 'in_progress', started_at: '2026-01-01T00:00:00.000Z', ended_at: null, notes: '',
  home_primary: '#15171C', home_secondary: '#FFFFFF', away_primary: '#1E63D6', away_secondary: '#FFFFFF',
};

function renderLog(events: GameEvent[]) {
  return render(<EventLog events={events} players={[]} game={game} gameStartedAt={game.started_at} />);
}

describe('EventLog times', () => {
  it('uses the clock snapshot when present', () => {
    renderLog([
      { id: 'e1', game_id: 'g1', player_id: null, team: 'home', event_type: 'goal', points: 1, half_or_period: 1, timestamp: '2026-01-01T00:40:00.000Z', clock_seconds: 125 },
    ]);
    expect(screen.getByText('02:05')).toBeInTheDocument();
  });

  it('falls back to wall-clock since kickoff when no snapshot', () => {
    renderLog([
      { id: 'e1', game_id: 'g1', player_id: null, team: 'home', event_type: 'goal', points: 1, half_or_period: 1, timestamp: '2026-01-01T00:03:00.000Z' },
    ]);
    expect(screen.getByText('03:00')).toBeInTheDocument();
  });
});
