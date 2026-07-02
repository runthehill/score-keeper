import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadSettings, saveSettings, getSavedTeams, upsertSavedTeam, deleteSavedTeam,
  SETTINGS_KEY, type AppSettings,
} from './settings';
import type { SavedTeam } from '../types';

beforeEach(() => localStorage.clear());

const team = (over: Partial<SavedTeam> = {}): SavedTeam => ({
  id: 't1', teamName: 'Coolera', players: [{ name: 'Aoife', number: '7' }], primary: '#E03131', secondary: '#FFFFFF', ...over,
});

describe('savedTeams round-trip', () => {
  it('saves and loads saved teams per sport', () => {
    const settings: AppSettings = { darkMode: true, savedTeams: { gaelic_football: [team()] } };
    saveSettings(settings);
    expect(loadSettings().savedTeams?.gaelic_football).toEqual([team()]);
  });
});

describe('legacy squads migration', () => {
  it('migrates a single squad into a one-element savedTeams array', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      darkMode: true,
      squads: { soccer: { teamName: 'Strand', players: [{ name: 'Sam', number: '9' }], primary: '#1E8E4E', secondary: '#FFFFFF' } },
    }));
    const loaded = loadSettings();
    expect(loaded.savedTeams?.soccer).toEqual([
      { id: 'legacy-soccer', teamName: 'Strand', players: [{ name: 'Sam', number: '9' }], primary: '#1E8E4E', secondary: '#FFFFFF' },
    ]);
  });

  it('ignores untrusted keys in stored squads (no prototype pollution)', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      darkMode: true,
      squads: { __proto__: { teamName: 'Evil', players: [] }, soccer: { teamName: 'Strand', players: [] } },
    }));
    const loaded = loadSettings();
    expect(loaded.savedTeams?.soccer?.[0].teamName).toBe('Strand');
    // The junk key is not treated as a sport and does not pollute Object.prototype.
    expect((loaded.savedTeams as Record<string, unknown>).__proto__).not.toBeInstanceOf(Array);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('does not overwrite existing savedTeams when squads is also present', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      darkMode: true,
      squads: { soccer: { teamName: 'Old', players: [] } },
      savedTeams: { soccer: [team({ id: 's1', teamName: 'New' })] },
    }));
    expect(loadSettings().savedTeams?.soccer).toEqual([team({ id: 's1', teamName: 'New' })]);
  });
});

describe('savedTeams helpers', () => {
  it('getSavedTeams returns [] when none', () => {
    expect(getSavedTeams({ darkMode: true }, 'basketball')).toEqual([]);
  });

  it('upsertSavedTeam adds a new team', () => {
    const next = upsertSavedTeam({ darkMode: true }, 'soccer', team());
    expect(getSavedTeams(next, 'soccer')).toEqual([team()]);
  });

  it('upsertSavedTeam updates by matching id', () => {
    const start = upsertSavedTeam({ darkMode: true }, 'soccer', team());
    const next = upsertSavedTeam(start, 'soccer', team({ teamName: 'Coolera U14s' }));
    expect(getSavedTeams(next, 'soccer')).toEqual([team({ teamName: 'Coolera U14s' })]);
  });

  it('upsertSavedTeam updates by case-insensitive name when id differs', () => {
    const start = upsertSavedTeam({ darkMode: true }, 'soccer', team({ id: 'a' }));
    const next = upsertSavedTeam(start, 'soccer', team({ id: 'b', teamName: 'COOLERA', players: [] }));
    const list = getSavedTeams(next, 'soccer');
    expect(list).toHaveLength(1);
    expect(list[0].players).toEqual([]);
  });

  it('deleteSavedTeam removes by id', () => {
    const start = upsertSavedTeam({ darkMode: true }, 'soccer', team());
    const next = deleteSavedTeam(start, 'soccer', 't1');
    expect(getSavedTeams(next, 'soccer')).toEqual([]);
  });
});
