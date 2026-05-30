# Sideline Refresh — Phase 4: Game Setup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Game Setup screen to "Sideline" and wire in the `ColorKitPicker` so each team's kit colours are chosen at setup and saved with the game — preserving the existing squad/player/period logic.

**Architecture:** Add per-sport home kit defaults in `kits.ts`; rewrite `GameSetup.tsx` with kit state + a `ColorKitPicker` sheet + a live `Scoreboard` preview + the Sideline restyle, and pass the four colour fields to `insertGame` (already supported since Phase 2).

**Tech Stack:** Vite + React + TS, Tailwind v3 (Phase-1 tokens), the Phase-2 colour system + Phase-3 `Scoreboard`.

**Spec:** `docs/superpowers/specs/2026-05-30-sideline-refresh-phase4-setup-design.md`. Phase 4 of 7. Visual source: `docs/design-handoff/src/screens.jsx` (`SetupScreen`, `DEFAULT_HOME`).

All commits include: `-m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`

---

### Task 1: Per-sport home kit defaults

**Files:** Modify `src/sports/kits.ts`, `src/sports/kits.test.ts`.

- [ ] **Step 1: Add the test** — in `src/sports/kits.test.ts`, add this `describe` block (keep the existing tests). Add `DEFAULT_HOME_KITS` to the import from `./kits`:

```ts
import { KITS, SWATCHES, DEFAULT_HOME_KIT, DEFAULT_AWAY_KIT, DEFAULT_HOME_KITS } from './kits';

// ... existing tests stay ...

describe('per-sport home kits', () => {
  it('has a hex kit for every sport', () => {
    const sports = ['rugby_union', 'soccer', 'gaelic_football', 'basketball'] as const;
    for (const s of sports) {
      const kit = DEFAULT_HOME_KITS[s];
      expect(kit.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(kit.secondary).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
```

- [ ] **Step 2: Run → FAIL** — `npx vitest run src/sports/kits.test.ts` (DEFAULT_HOME_KITS not exported).

- [ ] **Step 3: Implement** — in `src/sports/kits.ts`, add `Sport` to the type import and append the export:

```ts
import type { Sport } from '../types';

// ... existing Kit/KITS/SWATCHES/DEFAULT_HOME_KIT/DEFAULT_AWAY_KIT stay ...

// Per-sport home kit colours (club identities). Away defaults to DEFAULT_AWAY_KIT.
export const DEFAULT_HOME_KITS: Record<Sport, { primary: string; secondary: string }> = {
  rugby_union: { primary: '#15171C', secondary: '#E03131' },
  soccer: { primary: '#1E8E4E', secondary: '#FFFFFF' },
  gaelic_football: { primary: '#E03131', secondary: '#FFFFFF' },
  basketball: { primary: '#F25F1F', secondary: '#15171C' },
};
```
(If `kits.ts` has no existing import line, add `import type { Sport } from '../types';` at the top.)

- [ ] **Step 4: Run → PASS** — `npx vitest run src/sports/kits.test.ts`, then `npm run lint` (0). `npm run build` still succeeds (additive export).

- [ ] **Step 5: Commit**
```bash
git add src/sports/kits.ts src/sports/kits.test.ts
git commit -m "feat: add per-sport home kit colour defaults"
```

---

### Task 2: GameSetup screen — restyle + kit pickers + preview

**Files:** Rewrite `src/screens/GameSetup.tsx`.

Preserve every existing handler (`loadSquad`, `addPlayer`, `removePlayer`, `startGame`, the player editor, the period selector, settings/squad logic). The ONLY additions: kit state, the picker, the preview, the four colour args on `insertGame`, a back button, and the restyle.

- [ ] **Step 1: Replace `src/screens/GameSetup.tsx`** with:

```tsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import type { Sport, Player, Team, GameMetadata, PeriodConfig, Game } from '../types';
import { getSportConfig } from '../sports/configs';
import { useDB } from '../hooks/useDB';
import { insertGame, insertPlayer } from '../db/queries';
import { loadSettings } from '../utils/settings';
import { DEFAULT_HOME_KITS, DEFAULT_AWAY_KIT } from '../sports/kits';
import Scoreboard from '../components/Scoreboard';
import TeamKitChip from '../components/TeamKitChip';
import ColorKitPicker from '../components/ColorKitPicker';
import { ChevronLeft, Whistle, Edit } from '../components/icons';

interface DraftPlayer {
  name: string;
  number: string;
  status: 'active' | 'bench';
}

export default function GameSetup() {
  const { sportId } = useParams<{ sportId: string }>();
  const navigate = useNavigate();
  const { db, persist } = useDB();
  const sport = getSportConfig(sportId as Sport);
  const appSettings = loadSettings();
  const defaultSquad = appSettings.squads[sport.id];

  const [homeTeam, setHomeTeam] = useState(appSettings.defaultHomeTeam || '');
  const [awayTeam, setAwayTeam] = useState(appSettings.defaultAwayTeam || '');
  const [homeKit, setHomeKit] = useState(DEFAULT_HOME_KITS[sport.id]);
  const [awayKit, setAwayKit] = useState(DEFAULT_AWAY_KIT);
  const [picker, setPicker] = useState<Team | null>(null);
  const [showPlayers, setShowPlayers] = useState(false);
  const [homePlayers, setHomePlayers] = useState<DraftPlayer[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<DraftPlayer[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerNumber, setNewPlayerNumber] = useState('');
  const [addingFor, setAddingFor] = useState<Team>('home');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodConfig>(sport.periods);

  const loadSquad = (team: Team) => {
    if (!defaultSquad) return;
    if (team === 'home') {
      setHomeTeam(defaultSquad.teamName);
      setHomePlayers(defaultSquad.players.map((p) => ({ ...p, status: 'active' as const })));
    } else {
      setAwayTeam(defaultSquad.teamName);
      setAwayPlayers(defaultSquad.players.map((p) => ({ ...p, status: 'active' as const })));
    }
    setShowPlayers(true);
  };

  const addPlayer = () => {
    if (!newPlayerName.trim()) return;
    const player: DraftPlayer = { name: newPlayerName.trim(), number: newPlayerNumber, status: 'active' };
    if (addingFor === 'home') setHomePlayers((p) => [...p, player]);
    else setAwayPlayers((p) => [...p, player]);
    setNewPlayerName('');
    setNewPlayerNumber('');
  };

  const removePlayer = (team: Team, index: number) => {
    if (team === 'home') setHomePlayers((p) => p.filter((_, i) => i !== index));
    else setAwayPlayers((p) => p.filter((_, i) => i !== index));
  };

  const startGame = () => {
    if (!homeTeam.trim() || !awayTeam.trim()) return;
    const gameId = uuid();
    const metadata: GameMetadata = { periodCount: selectedPeriod.count, periodName: selectedPeriod.name };
    insertGame(db, {
      id: gameId,
      sport: sport.id,
      home_team: homeTeam.trim(),
      away_team: awayTeam.trim(),
      started_at: new Date().toISOString(),
      notes: JSON.stringify(metadata),
      home_primary: homeKit.primary,
      home_secondary: homeKit.secondary,
      away_primary: awayKit.primary,
      away_secondary: awayKit.secondary,
    });

    const savePlayers = (drafts: DraftPlayer[], team: Team) => {
      drafts.forEach((d) => {
        const player: Player = {
          id: uuid(),
          game_id: gameId,
          team,
          name: d.name,
          number: d.number ? parseInt(d.number, 10) : null,
          status: d.status,
        };
        insertPlayer(db, player);
      });
    };
    savePlayers(homePlayers, 'home');
    savePlayers(awayPlayers, 'away');
    persist();
    navigate(`/game/${gameId}`, { replace: true });
  };

  const previewGame: Game = {
    id: 'preview',
    sport: sport.id,
    home_team: homeTeam.trim() || sport.defaultTeamName,
    away_team: awayTeam.trim() || 'Opponent',
    home_score: 0,
    away_score: 0,
    status: 'in_progress',
    started_at: '',
    ended_at: null,
    notes: '',
    home_primary: homeKit.primary,
    home_secondary: homeKit.secondary,
    away_primary: awayKit.primary,
    away_secondary: awayKit.secondary,
  };

  const eyebrow = 'text-[11px] font-extrabold uppercase tracking-[0.08em] text-txt-3';
  const inputClass = 'w-full bg-surface-2 border border-line rounded-xl px-4 py-3 text-txt placeholder-txt-3 focus:outline-none focus:border-txt-3';

  const teamField = (label: string, which: Team) => {
    const name = which === 'home' ? homeTeam : awayTeam;
    const setName = which === 'home' ? setHomeTeam : setAwayTeam;
    const kit = which === 'home' ? homeKit : awayKit;
    return (
      <div className="bg-surface border border-line rounded-2xl p-3.5 flex items-center gap-3">
        <button type="button" onClick={() => setPicker(which)} className="relative shrink-0 press" aria-label={`Choose ${label.toLowerCase()} kit`}>
          <TeamKitChip primary={kit.primary} secondary={kit.secondary} size={42} radius={12} />
          <span className="absolute -right-1 -bottom-1 w-[18px] h-[18px] rounded-full bg-txt text-bg grid place-items-center">
            <Edit size={11} />
          </span>
        </button>
        <div className="flex-1 min-w-0">
          <div className={`${eyebrow} mb-1`}>{label}</div>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={which === 'home' ? sport.defaultTeamName : 'Opponent'}
              className="min-w-0 flex-1 bg-transparent text-txt font-bold text-[15.5px] placeholder-txt-3 focus:outline-none -tracking-[0.01em]"
            />
            {defaultSquad && (
              <button
                onClick={() => loadSquad(which)}
                className="shrink-0 bg-surface-2 border border-line rounded-lg px-2.5 py-1 text-[11px] font-semibold text-txt-2 press"
              >
                {defaultSquad.teamName}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="w-9 h-9 shrink-0 grid place-items-center rounded-full bg-surface-2 border border-line text-txt press"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0">
          <div className={eyebrow}>New game</div>
          <h1 className="text-xl font-extrabold text-txt -tracking-[0.02em] truncate">{sport.name}</h1>
        </div>
      </div>

      {/* Live preview */}
      <div>
        <p className={`${eyebrow} mb-2`}>Preview</p>
        <Scoreboard game={previewGame} events={[]} />
      </div>

      {/* Teams */}
      <div className="space-y-2.5">
        <p className={eyebrow}>Teams</p>
        {teamField('Home', 'home')}
        {teamField('Away', 'away')}
      </div>

      {/* Period selector */}
      {sport.periodOptions && sport.periodOptions.length > 1 && (
        <div>
          <p className={`${eyebrow} mb-2`}>Game format</p>
          <div className="flex gap-2">
            {sport.periodOptions.map((opt) => {
              const active = selectedPeriod.count === opt.count && selectedPeriod.name === opt.name;
              return (
                <button
                  key={opt.name}
                  onClick={() => setSelectedPeriod(opt)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold press ${active ? 'bg-txt text-bg' : 'bg-surface-2 border border-line text-txt-2'}`}
                >
                  {opt.count} {opt.name}s
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Players (optional) */}
      {!showPlayers ? (
        <button onClick={() => setShowPlayers(true)} className="text-sm text-txt-3 underline">
          + Add players (optional)
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setAddingFor('home')}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold press ${addingFor === 'home' ? 'bg-txt text-bg' : 'bg-surface-2 border border-line text-txt-2'}`}
            >
              {homeTeam || 'Home'}
            </button>
            <button
              onClick={() => setAddingFor('away')}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold press ${addingFor === 'away' ? 'bg-txt text-bg' : 'bg-surface-2 border border-line text-txt-2'}`}
            >
              {awayTeam || 'Away'}
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="Player name"
              className={`${inputClass} min-w-0 flex-1`}
              onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
            />
            <input
              type="number"
              value={newPlayerNumber}
              onChange={(e) => setNewPlayerNumber(e.target.value)}
              placeholder="#"
              className="w-16 shrink-0 bg-surface-2 border border-line rounded-xl px-2 py-3 text-txt text-center placeholder-txt-3 focus:outline-none focus:border-txt-3"
              onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
            />
            <button onClick={addPlayer} className="shrink-0 bg-txt text-bg rounded-xl px-4 font-semibold press">
              Add
            </button>
          </div>

          {[
            { team: 'home' as Team, players: homePlayers, label: homeTeam || 'Home' },
            { team: 'away' as Team, players: awayPlayers, label: awayTeam || 'Away' },
          ].map(({ team, players, label }) =>
            players.length > 0 ? (
              <div key={team}>
                <p className={`${eyebrow} mb-2`}>{label}</p>
                <div className="space-y-1">
                  {players.map((p, i) => (
                    <div key={i} className="flex items-center justify-between bg-surface-2 border border-line rounded-xl px-3 py-2">
                      <span className="text-sm text-txt">
                        {p.number && <span className="text-txt-3 mr-2">#{p.number}</span>}
                        {p.name}
                      </span>
                      <button onClick={() => removePlayer(team, i)} className="text-txt-3 text-xs" aria-label={`Remove ${p.name}`}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          )}
        </div>
      )}

      {/* Start */}
      <button
        onClick={startGame}
        disabled={!homeTeam.trim() || !awayTeam.trim()}
        className="w-full flex items-center justify-center gap-2 bg-txt text-bg rounded-xl py-4 font-bold text-lg disabled:opacity-40 press"
      >
        <Whistle size={19} /> Start Game
      </button>

      {/* Kit picker */}
      {picker && (
        <ColorKitPicker
          team={picker === 'home' ? homeTeam || 'Home' : awayTeam || 'Away'}
          value={picker === 'home' ? homeKit : awayKit}
          onChange={(kit) => (picker === 'home' ? setHomeKit(kit) : setAwayKit(kit))}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify** — `npx vitest run` (all green — no test depends on GameSetup markup), `npm run build` (SUCCESS — confirms the `insertGame` colour wiring + the preview `Game` shape typecheck), `npm run lint` (0 errors).

- [ ] **Step 3: Commit**
```bash
git add src/screens/GameSetup.tsx
git commit -m "feat: restyle Game Setup + wire team kit pickers, preview, per-sport defaults"
```

---

### Task 3: Stale-token sweep + version + changelog + final verification

**Files:** Modify `package.json`, `package-lock.json`, `CHANGELOG.md`.

- [ ] **Step 1: Grep for leftover legacy tokens** in the setup screen:
```bash
grep -rn "text-home\|text-away\|bg-home\|bg-away\|bg-accent\|surface-600\|surface-700\|surface-800\|text-white\|text-gray-\|ring-accent" src/screens/GameSetup.tsx
```
Expected: **no matches.** If any remain, replace with the Sideline equivalent and re-verify.

- [ ] **Step 2: Bump version** — `package.json` `1.1.9` → `1.1.10`; `package-lock.json` root + `packages[""]` `1.1.9` → `1.1.10` (do NOT touch dependency versions).

- [ ] **Step 3: Changelog** — in `CHANGELOG.md`, replace:
```md
All notable changes to this project will be documented in this file.

## [1.1.9] - 2026-05-30
```
with:
```md
All notable changes to this project will be documented in this file.

## [1.1.10] - 2026-05-30

### Added
- Choose each team's kit colours when setting up a game (Sideline refresh, Phase 4): tap a team's colour chip to pick a primary + secondary, with a live scoreboard preview and sensible per-sport home defaults. The chosen colours are saved with the game and shown throughout.

### Changed
- Game Setup screen restyled to the "Sideline" look. Team names, saved squads, optional players, and game format are unchanged.

## [1.1.9] - 2026-05-30
```

- [ ] **Step 4: Full verification** — `npx vitest run` (all green), `npm run build` (SUCCESS), `npm run lint` (0 errors).

- [ ] **Step 5: Commit**
```bash
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: bump version to 1.1.10 + changelog for Game Setup restyle"
```

---

## Plan self-review

**Spec coverage:**
- Per-sport home kit defaults → Task 1 ✅
- Per-team kit pickers wired to `insertGame` colours → Task 2 (`homeKit`/`awayKit` state, `ColorKitPicker`, colour args) ✅
- Live Scoreboard preview → Task 2 (`previewGame` + `<Scoreboard>`) ✅
- Sideline restyle + back button → Task 2 ✅
- Preserve squads/players/periods/settings → Task 2 keeps `loadSquad`/`addPlayer`/`removePlayer`/`startGame`/period selector verbatim ✅
- Stale-token sweep + version 1.1.10 → Task 3 ✅

**Placeholder scan:** none — the full file is provided; every handler retained.

**Type/name consistency:** `DEFAULT_HOME_KITS[sport.id]` returns `{primary,secondary}` matching `homeKit` state and `ColorKitPicker`'s `value`/`onChange` (`{primary,secondary}`); `insertGame`'s optional colour params match; `previewGame` includes all required `Game` fields; icons `ChevronLeft`/`Whistle`/`Edit` exist in the Phase-1 set; `Scoreboard`/`TeamKitChip`/`ColorKitPicker` default-exported and imported correctly; tokens used all exist (`bg-surface`,`bg-surface-2`,`border-line`,`text-txt`/`-2`/`-3`,`bg-txt`,`text-bg`,`placeholder-txt-3`,`press`). `ColorKitPicker.onChange` returns `{primary,secondary}` (Phase 2) → `setHomeKit`/`setAwayKit` accept it directly.

**Risk note:** `ColorKitPicker`'s `value` prop type is `{ primary, secondary }`; `homeKit`/`awayKit` are exactly that shape (from `DEFAULT_HOME_KITS`/`DEFAULT_AWAY_KIT`), so no adapter needed. The preview `Game` cast is a full literal (no `as`), so TypeScript validates every field.
