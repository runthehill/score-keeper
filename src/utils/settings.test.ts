import { describe, it, expect, beforeEach } from 'vitest';
import { loadSettings, saveSettings, type AppSettings } from './settings';

beforeEach(() => localStorage.clear());

describe('settings squad colours', () => {
  it('round-trips a squad with kit colours through save/load', () => {
    const settings: AppSettings = {
      darkMode: true,
      squads: { soccer: { teamName: 'Strand', players: [], primary: '#1E8E4E', secondary: '#FFFFFF' } },
    };
    saveSettings(settings);
    expect(loadSettings().squads.soccer).toEqual({
      teamName: 'Strand', players: [], primary: '#1E8E4E', secondary: '#FFFFFF',
    });
  });
});

describe('periodLengths setting', () => {
  it('defaults to an empty object when unset', () => {
    localStorage.clear();
    expect(loadSettings().periodLengths).toEqual({});
  });
  it('round-trips a per-sport length', () => {
    localStorage.clear();
    saveSettings({ darkMode: true, squads: {}, periodLengths: { gaelic_football: 30 } });
    expect(loadSettings().periodLengths).toEqual({ gaelic_football: 30 });
  });
});
