import type { Sport, DefaultSquad, SavedTeam } from '../types';
import { SPORTS } from '../sports/configs';

export const SETTINGS_KEY = 'score-keeper-settings';

export interface AppSettings {
  darkMode: boolean;
  squads?: Partial<Record<Sport, DefaultSquad>>; // legacy — migrated into savedTeams on load
  savedTeams?: Partial<Record<Sport, SavedTeam[]>>;
  periodLengths?: Partial<Record<Sport, number>>;
}

// Convert any legacy single-squad-per-sport entries into one-element savedTeams
// arrays. Only fills a sport that has no savedTeams yet, so it never clobbers
// teams saved by the current app. Deterministic id keeps it stable across loads
// until the next saveSettings persists it.
function migrateSquads(s: AppSettings): AppSettings {
  const squads = s.squads ?? {};
  const savedTeams = { ...(s.savedTeams ?? {}) };
  let changed = false;
  // Iterate a fixed allow-list of sport ids rather than Object.keys(squads):
  // squads comes from localStorage JSON, so untrusted keys (e.g. "__proto__")
  // must never reach object indexing/assignment.
  for (const key of SPORTS.map((sp) => sp.id)) {
    const squad = squads[key];
    const existing = savedTeams[key];
    if (squad && !(existing && existing.length)) {
      savedTeams[key] = [{
        id: `legacy-${key}`,
        teamName: squad.teamName,
        players: squad.players,
        primary: squad.primary,
        secondary: squad.secondary,
      }];
      changed = true;
    }
  }
  return changed ? { ...s, savedTeams } : s;
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return migrateSquads({ darkMode: true, savedTeams: {}, periodLengths: {}, ...parsed });
    }
  } catch {
    // Ignore malformed JSON or unavailable localStorage; fall back to defaults below.
  }
  return { darkMode: true, savedTeams: {}, periodLengths: {} };
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getSavedTeams(settings: AppSettings, sport: Sport): SavedTeam[] {
  return settings.savedTeams?.[sport] ?? [];
}

export function upsertSavedTeam(settings: AppSettings, sport: Sport, team: SavedTeam): AppSettings {
  const list = settings.savedTeams?.[sport] ?? [];
  const idx = list.findIndex(
    (t) => t.id === team.id || t.teamName.toLowerCase() === team.teamName.toLowerCase()
  );
  const next = idx >= 0 ? list.map((t, i) => (i === idx ? team : t)) : [...list, team];
  return { ...settings, savedTeams: { ...(settings.savedTeams ?? {}), [sport]: next } };
}

export function deleteSavedTeam(settings: AppSettings, sport: Sport, teamId: string): AppSettings {
  const list = (settings.savedTeams?.[sport] ?? []).filter((t) => t.id !== teamId);
  return { ...settings, savedTeams: { ...(settings.savedTeams ?? {}), [sport]: list } };
}
