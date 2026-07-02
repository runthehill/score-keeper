import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditGameSheet from './EditGameSheet';
import type { Game, Player } from '../types';

const game: Game = {
  id: 'g1', sport: 'gaelic_football', home_team: 'Coolera', away_team: 'Strandhill',
  home_score: 0, away_score: 0, status: 'in_progress', started_at: '', ended_at: null, notes: '',
  home_primary: '#E03131', home_secondary: '#FFFFFF', away_primary: '#1E63D6', away_secondary: '#FFFFFF',
};
const players: Player[] = [
  { id: 'p1', game_id: 'g1', team: 'home', name: 'Aoife', number: 7, status: 'active', sort_order: 0 },
];

describe('EditGameSheet', () => {
  it('prefills team names and saves edits + a new player', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<EditGameSheet game={game} players={players} onSave={onSave} onClose={() => {}} />);

    expect(screen.getByDisplayValue('Coolera')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Home team name'));
    await user.type(screen.getByLabelText('Home team name'), 'Coolera Strandhill');

    // add a home player
    const addNames = screen.getAllByLabelText('New player name');
    await user.type(addNames[0], 'Niamh');
    await user.click(screen.getAllByText('Add')[0]);

    await user.click(screen.getByText('Save changes'));

    expect(onSave).toHaveBeenCalledTimes(1);
    const arg = onSave.mock.calls[0][0];
    expect(arg.homeTeam).toBe('Coolera Strandhill');
    expect(arg.homeRows).toEqual([
      { id: 'p1', name: 'Aoife', number: '7' },
      { name: 'Niamh', number: '' },
    ]);
  });

  it('does not offer to remove players', () => {
    render(<EditGameSheet game={game} players={players} onSave={() => {}} onClose={() => {}} />);
    expect(screen.queryByLabelText('Remove Aoife')).not.toBeInTheDocument();
  });
});
