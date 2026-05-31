# Sideline Refresh — Phase 7: Settings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle Settings to "Sideline" and add a Dark/Light toggle wired to the theme system — preserving squads, default team names, data export/clear, share, and install.

**Architecture:** Rewrite `src/screens/Settings.tsx` keeping every handler; add `useThemeContext()` + an inline `Toggle`; group sections into Sideline cards; restyle the two modals. Version bump completes the refresh.

**Tech Stack:** Vite + React + TS, Tailwind v3 (Phase-1 tokens), Phase-1 `useTheme`/`AppHeader`.

**Spec:** `docs/superpowers/specs/2026-05-30-sideline-refresh-phase7-settings-design.md`. Phase 7 of 7. Visual source: `screens2.jsx` `SettingsScreen`.

All commits include: `-m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`

---

### Task 1: Restyle Settings + dark-mode toggle

**Files:** Rewrite `src/screens/Settings.tsx`.

Preserve every handler verbatim (`openSquadEditor`, `addSquadPlayer`, `removeSquadPlayer`, `saveSquad`, `deleteSquad`, `handleExportAll`, `handleClearAll`, the share + install handlers, the `saveSettings` autosave). Add `useThemeContext` + the `Toggle` + the Appearance section; restyle everything else.

- [ ] **Step 1: Replace `src/screens/Settings.tsx`** with:

```tsx
import { useState, useEffect } from 'react';
import type { Sport, DefaultSquadPlayer } from '../types';
import { SPORTS } from '../sports/configs';
import { getSportConfig } from '../sports/configs';
import { useDB } from '../hooks/useDB';
import { useThemeContext } from '../hooks/useTheme';
import { listGames, listEvents, listPlayers } from '../db/queries';

const APP_VERSION = __APP_VERSION__;
import { downloadFile } from '../utils/export';
import { clearDB } from '../db/init';
import { loadSettings, saveSettings } from '../utils/settings';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import IosInstallSheet from '../components/IosInstallSheet';
import AppHeader from '../components/AppHeader';

const EYEBROW = 'text-[11px] font-extrabold uppercase tracking-[0.08em] text-txt-3 mb-2.5';
const INPUT = 'w-full bg-surface-2 border border-line rounded-xl px-4 py-3 text-txt placeholder-txt-3 focus:outline-none focus:border-txt-3';

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="switch"
      aria-checked={on}
      aria-label={label}
      className="relative w-[46px] h-7 rounded-full shrink-0 transition-colors"
      style={{ background: on ? 'var(--txt)' : 'var(--line-2)' }}
    >
      <span className="absolute top-[3px] w-[22px] h-[22px] rounded-full transition-all" style={{ left: on ? 21 : 3, background: 'var(--surface)', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
    </button>
  );
}

export default function Settings() {
  const { db } = useDB();
  const { dark, toggle } = useThemeContext();
  const [settings, setSettings] = useState(loadSettings);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [editingSport, setEditingSport] = useState<Sport | null>(null);
  const [squadName, setSquadName] = useState('');
  const [squadPlayers, setSquadPlayers] = useState<DefaultSquadPlayer[]>([]);
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const { mode: installMode, promptInstall } = useInstallPrompt();
  const [showIosInstall, setShowIosInstall] = useState(false);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const openSquadEditor = (sportId: Sport) => {
    const squad = settings.squads[sportId];
    const sportConfig = getSportConfig(sportId);
    setEditingSport(sportId);
    setSquadName(squad?.teamName ?? sportConfig.defaultTeamName);
    setSquadPlayers(squad?.players ? [...squad.players] : []);
    setNewName('');
    setNewNumber('');
  };

  const addSquadPlayer = () => {
    if (!newName.trim()) return;
    setSquadPlayers((p) => [...p, { name: newName.trim(), number: newNumber }]);
    setNewName('');
    setNewNumber('');
  };

  const removeSquadPlayer = (index: number) => {
    setSquadPlayers((p) => p.filter((_, i) => i !== index));
  };

  const saveSquad = () => {
    if (!editingSport) return;
    setSettings((s) => ({
      ...s,
      squads: { ...s.squads, [editingSport]: { teamName: squadName.trim(), players: squadPlayers } },
    }));
    setEditingSport(null);
  };

  const deleteSquad = () => {
    if (!editingSport) return;
    setSettings((s) => {
      const squads = { ...s.squads };
      delete squads[editingSport];
      return { ...s, squads };
    });
    setEditingSport(null);
  };

  const handleExportAll = () => {
    const games = listGames(db);
    const allData = games.map((game) => ({
      game,
      players: listPlayers(db, game.id),
      events: listEvents(db, game.id),
    }));
    downloadFile(JSON.stringify(allData, null, 2), 'score-keeper-all-data.json', 'application/json');
  };

  const handleClearAll = async () => {
    await clearDB();
    setShowClearConfirm(false);
    window.location.reload();
  };

  const handleShareApp = async () => {
    const url = 'https://runthehill.github.io/score-keeper/';
    const shareData = { title: "Jonathan's Score Keeper", text: 'Keep score at kids sports games — works offline!', url };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        setShareMessage('Link copied!');
        setTimeout(() => setShareMessage(''), 2000);
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        await navigator.clipboard.writeText(url);
        setShareMessage('Link copied!');
        setTimeout(() => setShareMessage(''), 2000);
      }
    }
  };

  const cardBtn = 'w-full bg-surface-2 border border-line rounded-xl py-3 text-sm font-semibold text-txt-2 press';

  return (
    <div className="p-4 space-y-6">
      <AppHeader subtitle="Preferences" />

      {/* Appearance */}
      <section>
        <h2 className={EYEBROW}>Appearance</h2>
        <div className="bg-surface border border-line rounded-2xl flex items-center justify-between px-4 py-3.5">
          <span className="text-sm font-semibold text-txt">Dark mode</span>
          <Toggle on={dark} onClick={toggle} label="Dark mode" />
        </div>
      </section>

      {/* Default squads */}
      <section>
        <h2 className={EYEBROW}>Default squads</h2>
        <p className="text-xs text-txt-3 mb-2.5">Set up your team and squad for each sport. Load them quickly when starting a game.</p>
        <div className="space-y-2">
          {SPORTS.map((sport) => {
            const squad = settings.squads[sport.id];
            return (
              <button key={sport.id} type="button" onClick={() => openSquadEditor(sport.id)} className="w-full bg-surface border border-line rounded-2xl px-4 py-3 flex items-center justify-between press">
                <div className="flex items-center gap-3">
                  <span className="text-xl" aria-hidden="true">{sport.icon}</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-txt">{sport.name}</p>
                    <p className="text-xs text-txt-3">{squad ? `${squad.teamName} — ${squad.players.length} players` : 'No squad set'}</p>
                  </div>
                </div>
                <span className="text-txt-3 text-sm">{squad ? 'Edit' : '+'}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Default team names */}
      <section>
        <h2 className={EYEBROW}>Default team names</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-txt-3 mb-1 block">Home team</label>
            <input type="text" value={settings.defaultHomeTeam} onChange={(e) => setSettings((s) => ({ ...s, defaultHomeTeam: e.target.value }))} placeholder="e.g. Sligo All Stars" className={INPUT} />
          </div>
          <div>
            <label className="text-xs text-txt-3 mb-1 block">Away team</label>
            <input type="text" value={settings.defaultAwayTeam} onChange={(e) => setSettings((s) => ({ ...s, defaultAwayTeam: e.target.value }))} placeholder="e.g. Limerick Celtics" className={INPUT} />
          </div>
        </div>
      </section>

      {/* Data */}
      <section>
        <h2 className={EYEBROW}>Data</h2>
        <div className="space-y-2">
          <button type="button" onClick={handleExportAll} className={cardBtn}>Export all data (JSON)</button>
          <button type="button" onClick={() => setShowClearConfirm(true)} className="w-full bg-surface-2 rounded-xl py-3 text-sm font-semibold text-danger press" style={{ boxShadow: 'inset 0 0 0 1px var(--line-2)' }}>Clear all data</button>
        </div>
      </section>

      {/* Share */}
      <section>
        <h2 className={EYEBROW}>Share</h2>
        <button type="button" onClick={handleShareApp} className={cardBtn}>{shareMessage || 'Share this app'}</button>
      </section>

      {/* Install */}
      {installMode !== 'hidden' && (
        <section>
          <h2 className={EYEBROW}>Install</h2>
          <button type="button" onClick={() => { if (installMode === 'ios') setShowIosInstall(true); else void promptInstall().catch(() => {}); }} className={cardBtn}>
            {installMode === 'ios' ? 'Add to home screen' : 'Install app'}
          </button>
        </section>
      )}

      {showIosInstall && <IosInstallSheet onClose={() => setShowIosInstall(false)} />}

      <div className="text-center pt-4 space-y-1">
        <p className="text-xs text-txt-3">Jonathan's Score Keeper v{APP_VERSION}</p>
        <a href="https://github.com/runthehill/score-keeper" target="_blank" rel="noopener noreferrer" className="text-xs text-txt-2 underline">GitHub</a>
      </div>

      {/* Squad editor modal */}
      {editingSport && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setEditingSport(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full bg-surface rounded-t-2xl border-t border-line p-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-txt flex items-center gap-2">
                <span aria-hidden="true">{getSportConfig(editingSport).icon}</span> {getSportConfig(editingSport).name} squad
              </h3>
              {settings.squads[editingSport] && (
                <button type="button" onClick={deleteSquad} className="text-xs text-danger">Clear</button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-txt-3 mb-1 block">Team name</label>
                <input type="text" value={squadName} onChange={(e) => setSquadName(e.target.value)} placeholder="e.g. Sligo All Stars" className={INPUT} />
              </div>

              <div>
                <label className="text-xs text-txt-3 mb-1 block">Players</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Player name" className={`${INPUT} min-w-0 flex-1`} onKeyDown={(e) => e.key === 'Enter' && addSquadPlayer()} />
                  <input type="number" value={newNumber} onChange={(e) => setNewNumber(e.target.value)} placeholder="#" className="w-16 shrink-0 bg-surface-2 border border-line rounded-xl px-2 py-3 text-txt text-center placeholder-txt-3 focus:outline-none focus:border-txt-3" onKeyDown={(e) => e.key === 'Enter' && addSquadPlayer()} />
                  <button type="button" onClick={addSquadPlayer} className="shrink-0 bg-txt text-bg rounded-xl px-4 font-semibold press">Add</button>
                </div>
                <div className="space-y-1">
                  {squadPlayers.map((p, i) => (
                    <div key={i} className="flex items-center justify-between bg-surface-2 border border-line rounded-xl px-3 py-2">
                      <span className="text-sm text-txt">
                        {p.number && <span className="text-txt-3 mr-2">#{p.number}</span>}
                        {p.name}
                      </span>
                      <button type="button" onClick={() => removeSquadPlayer(i)} className="text-txt-3 text-xs" aria-label={`Remove ${p.name}`}>✕</button>
                    </div>
                  ))}
                  {squadPlayers.length === 0 && <p className="text-xs text-txt-3 text-center py-2">No players added yet</p>}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button type="button" onClick={() => setEditingSport(null)} className="flex-1 py-3 border border-line rounded-xl text-sm font-medium text-txt-2 press">Cancel</button>
              <button type="button" onClick={saveSquad} disabled={!squadName.trim()} className="flex-1 py-3 bg-txt text-bg rounded-xl text-sm font-bold disabled:opacity-40 press">Save squad</button>
            </div>
          </div>
        </div>
      )}

      {/* Clear data confirmation */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowClearConfirm(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-surface rounded-2xl border border-line p-6 mx-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold mb-2 text-txt">Clear all data?</h3>
            <p className="text-sm text-txt-3 mb-4">This will permanently delete all games, players, and events. This cannot be undone.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowClearConfirm(false)} className="flex-1 py-3 border border-line rounded-xl text-sm font-medium text-txt-2 press">Cancel</button>
              <button type="button" onClick={handleClearAll} className="flex-1 py-3 rounded-xl text-sm font-bold text-white press" style={{ background: 'var(--danger)' }}>Delete everything</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify** — `npx vitest run` (all green), `npm run build` (SUCCESS — confirms `useThemeContext`, `AppHeader`, the handlers, and `__APP_VERSION__` all resolve), `npm run lint` (0 errors). Read the current `src/screens/Settings.tsx` first to confirm the imports (`loadSettings`/`saveSettings`, `clearDB`, `useInstallPrompt`, `IosInstallSheet`, `DefaultSquadPlayer`, `__APP_VERSION__`) match — the data logic is unchanged from the original.

- [ ] **Step 3: Commit**
```bash
git add src/screens/Settings.tsx
git commit -m "feat: restyle Settings + add dark/light toggle (Sideline)"
```

---

### Task 2: Stale-token sweep + version + changelog + final verification

**Files:** Modify `package.json`, `package-lock.json`, `CHANGELOG.md`.

- [ ] **Step 1: Grep for leftover legacy tokens:**
```bash
grep -rn "text-home\|text-away\|bg-home\|bg-away\|bg-accent\|text-accent\|surface-600\|surface-700\|surface-800\|text-white\|text-gray-\|red-[0-9]\|ring-accent" src/screens/Settings.tsx
```
Expected: **only** the one intentional `text-white` on the "Delete everything" button (white text on the solid `--danger` fill — acceptable contrast). Everything else must be gone. Fix any others and re-verify.

- [ ] **Step 2: Bump version** — `package.json` `1.1.12` → `1.1.13`; `package-lock.json` root + `packages[""]` `1.1.12` → `1.1.13` (do NOT touch dependency versions).

- [ ] **Step 3: Changelog** — in `CHANGELOG.md`, replace:
```md
All notable changes to this project will be documented in this file.

## [1.1.12] - 2026-05-30
```
with:
```md
All notable changes to this project will be documented in this file.

## [1.1.13] - 2026-05-30

### Added
- A Dark / Light mode toggle in Settings (Sideline refresh, Phase 7). The app still follows your device theme by default; the toggle is a manual override that sticks.

### Changed
- Settings screen restyled to the "Sideline" look. Default squads, default team names, data export/clear, share, and install are unchanged.

## [1.1.12] - 2026-05-30
```

- [ ] **Step 4: Full verification** — `npx vitest run` (all green), `npm run build` (SUCCESS), `npm run lint` (0 errors).

- [ ] **Step 5: Commit**
```bash
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: bump version to 1.1.13 + changelog for Settings restyle"
```

---

## Plan self-review

**Spec coverage:**
- Dark-mode toggle wired to `useThemeContext` → Task 1 (Appearance section + `Toggle`) ✅
- Sideline restyle (AppHeader, grouped cards, tokens) → Task 1 ✅
- Preserve squads + editor, default teams, data export/clear, share, install, footer → Task 1 keeps all handlers verbatim ✅
- Stale-token sweep + version 1.1.13 → Task 2 ✅

**Placeholder scan:** none — full file provided; every handler retained.

**Type/name consistency:** `useThemeContext()` returns `{ dark, toggle }` (Phase 1) — used directly; `Toggle` props `{on,onClick,label}`; `AppHeader` `{subtitle?}` matches; `getSportConfig`/`SPORTS`/`loadSettings`/`saveSettings`/`clearDB`/`useInstallPrompt`/`IosInstallSheet`/`downloadFile`/`listGames`/`listEvents`/`listPlayers`/`DefaultSquadPlayer`/`__APP_VERSION__` all imported as in the original. Tokens used (`bg-surface`,`bg-surface-2`,`border-line`,`text-txt`/`-2`/`-3`,`bg-txt`,`text-bg`,`text-danger`,`line-2`,`press`) all exist. The one `text-white` (on `--danger` fill) is the single intentional literal, flagged in Task 2's grep.

**Note:** `getSportConfig(editingSport)` is called in the modal header instead of the original's `SPORTS.find(...)` — equivalent (both resolve the sport), and `getSportConfig` is already imported. The squad/clear logic is byte-for-byte the original.
