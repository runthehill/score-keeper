import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Settings from './Settings';
import { loadSettings } from '../utils/settings';

// Settings pulls DB + theme from context hooks; stub them so the screen renders.
vi.mock('../hooks/useDB', () => ({ useDB: () => ({ db: {}, persist: () => {} }) }));
vi.mock('../hooks/useTheme', () => ({ useThemeContext: () => ({ dark: true, toggle: () => {} }) }));
vi.mock('../hooks/useInstallPrompt', () => ({ useInstallPrompt: () => ({ mode: 'hidden', promptInstall: async () => {} }) }));
vi.mock('../db/queries', () => ({ listGames: () => [], listEvents: () => [], listPlayers: () => [] }));

beforeEach(() => localStorage.clear());

describe('Settings saved teams', () => {
  it('adds a saved team for a sport and persists it', async () => {
    const user = userEvent.setup();
    render(<Settings />);
    await user.click(screen.getByRole('button', { name: /Gaelic Football/ })); // open the sport's team list
    await user.click(screen.getByText('+ New team'));                           // open the editor
    await user.clear(screen.getByLabelText('Team name'));
    await user.type(screen.getByLabelText('Team name'), 'Coolera U12s');
    await user.type(screen.getByLabelText('New player name'), 'Aoife');
    await user.type(screen.getByLabelText('New player number'), '7');
    await user.click(screen.getByText('Add'));
    await user.click(screen.getByText('Save team'));
    const saved = loadSettings().savedTeams?.gaelic_football;
    expect(saved).toHaveLength(1);
    expect(saved![0].teamName).toBe('Coolera U12s');
    expect(saved![0].players).toEqual([{ name: 'Aoife', number: '7' }]);
  });
});
