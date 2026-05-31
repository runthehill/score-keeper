import { describe, it, expect, beforeEach } from 'vitest';
import { loadSettings, saveSettings, type AppSettings } from './settings';

beforeEach(() => localStorage.clear());

describe('settings squad colours', () => {
  it('round-trips a squad with kit colours through save/load', () => {
    const settings: AppSettings = {
      defaultHomeTeam: '',
      defaultAwayTeam: '',
      darkMode: true,
      squads: { soccer: { teamName: 'Strand', players: [], primary: '#1E8E4E', secondary: '#FFFFFF' } },
    };
    saveSettings(settings);
    expect(loadSettings().squads.soccer).toEqual({
      teamName: 'Strand', players: [], primary: '#1E8E4E', secondary: '#FFFFFF',
    });
  });
});
