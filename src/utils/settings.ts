import type { Sport, DefaultSquad } from '../types';

export const SETTINGS_KEY = 'score-keeper-settings';

export interface AppSettings {
  darkMode: boolean;
  squads: Partial<Record<Sport, DefaultSquad>>;
  periodLengths?: Partial<Record<Sport, number>>;
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Older stored settings may still carry the removed default team name fields — harmless; ignored.
      return { darkMode: true, squads: {}, periodLengths: {}, ...parsed };
    }
  } catch {
    // Ignore malformed JSON or unavailable localStorage; fall back to defaults below.
  }
  return { darkMode: true, squads: {}, periodLengths: {} };
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
