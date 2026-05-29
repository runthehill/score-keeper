import type { Sport, DefaultSquadPlayer } from '../types';

export const SETTINGS_KEY = 'score-keeper-settings';

export interface AppSettings {
  defaultHomeTeam: string;
  defaultAwayTeam: string;
  darkMode: boolean;
  squads: Partial<Record<Sport, { teamName: string; players: DefaultSquadPlayer[] }>>;
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { defaultHomeTeam: '', defaultAwayTeam: '', darkMode: true, squads: {}, ...parsed };
    }
  } catch {
    // Ignore malformed JSON or unavailable localStorage; fall back to defaults below.
  }
  return { defaultHomeTeam: '', defaultAwayTeam: '', darkMode: true, squads: {} };
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
