import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SavedTeamPicker from './SavedTeamPicker';
import type { SavedTeam } from '../types';

const teams: SavedTeam[] = [
  { id: 't1', teamName: 'Coolera U12s', players: [{ name: 'A', number: '1' }, { name: 'B', number: '2' }] },
  { id: 't2', teamName: 'Strandhill', players: [] },
];

describe('SavedTeamPicker', () => {
  it('lists saved teams with player counts', () => {
    render(<SavedTeamPicker teams={teams} sportId="gaelic_football" onSelect={() => {}} onClose={() => {}} />);
    expect(screen.getByText('Coolera U12s')).toBeInTheDocument();
    expect(screen.getByText('2 players')).toBeInTheDocument();
    expect(screen.getByText('Strandhill')).toBeInTheDocument();
    expect(screen.getByText('No players')).toBeInTheDocument();
  });

  it('selecting a team calls onSelect with it', async () => {
    const onSelect = vi.fn();
    render(<SavedTeamPicker teams={teams} sportId="gaelic_football" onSelect={onSelect} onClose={() => {}} />);
    await userEvent.setup().click(screen.getByText('Coolera U12s'));
    expect(onSelect).toHaveBeenCalledWith(teams[0]);
  });
});
