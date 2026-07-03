# Add Hurling & Camogie Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Hurling and Camogie as two new sports — near-clones of Gaelic Football with their own scoring, long-range free stat (65 / 45), and cards.

**Architecture:** Adding a sport is data-driven: extend the `Sport` union, add two `SportConfig` entries, and fill the two total `Record<Sport, …>` lookups (kit colours + Home-card tints). All screens read the config, so they pick the new sports up automatically.

**Tech Stack:** TypeScript, Vite + React, vitest.

## Global Constraints

- **Config-driven:** no sport-specific code paths; screens read `SPORTS` / `getSportConfig`.
- **TDD** — failing test first, minimal implementation, commit.
- **No new dependencies.**
- **Before the deploying push:** bump the patch version in `package.json` and the root `version` in `package-lock.json`, and add a `CHANGELOG.md` entry (Task 2).
- Test runner: `npx vitest run <path>`; typecheck `npx tsc -b`.
- Exact scoring/stats/cards (verbatim from spec):
  - Hurling: scoring `point`(1)/`goal`(3)/`wide`(0); stats `penalty`,`65`; cards yellow/black/red; icon `🔵`.
  - Camogie: scoring `point`(1)/`goal`(3)/`wide`(0); stats `penalty`,`45`; cards yellow/red; icon `🟣`.

---

### Task 1: Sport type, configs, and per-sport lookups

**Files:**
- Modify: `src/types/index.ts:1`
- Modify: `src/sports/configs.ts` (after the `gaelic_football` entry)
- Modify: `src/sports/kits.ts:32-37`
- Modify: `src/components/SportCard.tsx:5-10`
- Test: `src/sports/configs.test.ts`

**Interfaces:**
- Produces: `Sport` union includes `'hurling'` and `'camogie'`; `getSportConfig('hurling')` / `getSportConfig('camogie')` return valid configs; `DEFAULT_HOME_KITS` and `TINTS` have entries for both.

- [ ] **Step 1: Write the failing tests**

Add to `src/sports/configs.test.ts`. First, change the count assertion:

```ts
  it('defines exactly 6 sports', () => {
    expect(SPORTS).toHaveLength(6);
  });
```

(Replace the existing `it('defines exactly 4 sports', … toHaveLength(4))`.)

Extend the per-sport `it.each` list to include the new ids:

```ts
  it.each(['rugby_union', 'soccer', 'gaelic_football', 'basketball', 'hurling', 'camogie'] as const)(
    '%s has valid config',
    (sportId) => {
      const config = getSportConfig(sportId);
      expect(config).toBeDefined();
      expect(config.id).toBe(sportId);
      expect(config.name).toBeTruthy();
      expect(config.icon).toBeTruthy();
      expect(config.periods.count).toBeGreaterThan(0);
      expect(config.periods.name).toBeTruthy();
      expect(config.scoringEvents.length).toBeGreaterThan(0);
    }
  );
```

Add a new describe block:

```ts
describe('hurling and camogie', () => {
  it('hurling: point/goal/wide scoring, no two-pointer, split display', () => {
    const h = getSportConfig('hurling');
    expect(h.scoreDisplay).toBe('split');
    expect(h.scoringEvents.map((e) => e.type)).toEqual(['point', 'goal', 'wide']);
    expect(h.scoringEvents.find((e) => e.type === 'two_pointer')).toBeUndefined();
  });
  it('hurling: stats are penalty and 65 (not 45)', () => {
    const types = getSportConfig('hurling').statEvents.map((s) => s.type);
    expect(types).toEqual(expect.arrayContaining(['penalty', '65']));
    expect(types).not.toContain('45');
  });
  it('hurling: has a black card', () => {
    expect(getSportConfig('hurling').cardEvents.find((c) => c.type === 'card_black')).toBeDefined();
  });
  it('camogie: point/goal/wide scoring, no two-pointer, split display', () => {
    const c = getSportConfig('camogie');
    expect(c.scoreDisplay).toBe('split');
    expect(c.scoringEvents.map((e) => e.type)).toEqual(['point', 'goal', 'wide']);
    expect(c.scoringEvents.find((e) => e.type === 'two_pointer')).toBeUndefined();
  });
  it('camogie: stats are penalty and 45 (not 65)', () => {
    const types = getSportConfig('camogie').statEvents.map((s) => s.type);
    expect(types).toEqual(expect.arrayContaining(['penalty', '45']));
    expect(types).not.toContain('65');
  });
  it('camogie: no black card (yellow and red only)', () => {
    const cards = getSportConfig('camogie').cardEvents.map((c) => c.type);
    expect(cards).toEqual(['card_yellow', 'card_red']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/sports/configs.test.ts`
Expected: FAIL — only 4 sports; `getSportConfig('hurling')` throws "Unknown sport". (TS will also flag `'hurling'`/`'camogie'` as invalid until Step 3.)

- [ ] **Step 3: Extend the `Sport` union**

In `src/types/index.ts` line 1:

```ts
export type Sport = 'rugby_union' | 'soccer' | 'gaelic_football' | 'basketball' | 'hurling' | 'camogie';
```

- [ ] **Step 4: Add the two configs**

In `src/sports/configs.ts`, immediately after the `gaelic_football` object (before the `basketball` object), insert:

```ts
  {
    id: 'hurling',
    name: 'Hurling',
    icon: '🔵',
    defaultTeamName: 'Coolera Strandhill',
    periods: { count: 2, name: 'Half' },
    extraPeriods: [{ type: 'extra_time', label: 'Extra Time' }],
    scoreDisplay: 'split',
    scoringEvents: [
      { type: 'point', label: 'Point', points: 1, icon: '☝️', color: '#e5e7eb' },
      { type: 'goal', label: 'Goal', points: 3, icon: '🥅', color: '#22c55e' },
      { type: 'wide', label: 'Wide', points: 0, icon: '🚩' },
    ],
    statEvents: [
      { type: 'penalty', label: 'Penalty', icon: '🎯' },
      { type: '65', label: '65', icon: '🦵' },
    ],
    cardEvents: [
      { type: 'card_yellow', label: 'Yellow Card', color: '#facc15' },
      { type: 'card_black', label: 'Black Card', color: '#1a1a2e' },
      { type: 'card_red', label: 'Red Card', color: '#ef4444' },
    ],
  },
  {
    id: 'camogie',
    name: 'Camogie',
    icon: '🟣',
    defaultTeamName: 'Coolera Strandhill',
    periods: { count: 2, name: 'Half' },
    extraPeriods: [{ type: 'extra_time', label: 'Extra Time' }],
    scoreDisplay: 'split',
    scoringEvents: [
      { type: 'point', label: 'Point', points: 1, icon: '☝️', color: '#e5e7eb' },
      { type: 'goal', label: 'Goal', points: 3, icon: '🥅', color: '#22c55e' },
      { type: 'wide', label: 'Wide', points: 0, icon: '🚩' },
    ],
    statEvents: [
      { type: 'penalty', label: 'Penalty', icon: '🎯' },
      { type: '45', label: '45', icon: '🦵' },
    ],
    cardEvents: [
      { type: 'card_yellow', label: 'Yellow Card', color: '#facc15' },
      { type: 'card_red', label: 'Red Card', color: '#ef4444' },
    ],
  },
```

- [ ] **Step 5: Fill the two total `Record<Sport>` lookups**

In `src/sports/kits.ts`, add to the `DEFAULT_HOME_KITS` object (after `basketball`):

```ts
  hurling: { primary: '#1E63D6', secondary: '#FFFFFF' },
  camogie: { primary: '#5B2A86', secondary: '#F4C430' },
```

In `src/components/SportCard.tsx`, add to the `TINTS` object (after `basketball`):

```ts
  hurling: '#1E63D6',
  camogie: '#5B2A86',
```

- [ ] **Step 6: Run tests + typecheck**

Run: `npx vitest run src/sports/configs.test.ts && npx tsc -b`
Expected: PASS; no type errors (the two `Record<Sport>` lookups now satisfy exhaustiveness).

- [ ] **Step 7: Commit**

```bash
git add src/types/index.ts src/sports/configs.ts src/sports/kits.ts src/components/SportCard.tsx src/sports/configs.test.ts
git commit -m "feat: add Hurling and Camogie sports"
```

---

### Task 2: Verify, version bump, changelog

**Files:**
- Modify: `package.json`, `package-lock.json`, `CHANGELOG.md`

- [ ] **Step 1: Full verification**

Run: `npx vitest run && npm run lint && npm run build`
Expected: all tests pass, no `src` lint errors, build succeeds. (`npm run lint` may report the git-ignored `.remember/tmp/*` scratch file — ignore it; confirm `npx eslint src` is clean.)

- [ ] **Step 2: Bump the patch version**

Set `version` to `1.1.27` in `package.json`, and the two root `"version": "1.1.27"` entries in `package-lock.json` (top-level and `packages[""]`). Confirm:

Run: `node -p "require('./package.json').version"`
Expected: `1.1.27`

- [ ] **Step 3: Add a CHANGELOG entry**

Prepend to `CHANGELOG.md` (match existing format):

```
## [1.1.27] - 2026-07-03

### Added
- Two new sports: Hurling (Point/Goal/Wide scoring, a 65, and yellow/black/red cards) and Camogie (same scoring, a 45, yellow/red cards). Both use the Gaelic goals–points scoreline.
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: bump to 1.1.27, changelog for Hurling & Camogie"
```

---

## Self-Review

**Spec coverage:**
- `Sport` union extended → Task 1 Step 3. ✓
- Hurling config (point/goal/wide, penalty+65, yellow/black/red, 🔵, split, 2 halves + ET) → Task 1 Step 4. ✓
- Camogie config (point/goal/wide, penalty+45, yellow/red, 🟣, split, 2 halves + ET) → Task 1 Step 4. ✓
- `DEFAULT_HOME_KITS` + `TINTS` entries (required by total `Record<Sport>`) → Task 1 Step 5. ✓
- Tests: count 6, per-sport each, scoring/stats/cards per sport → Task 1 Step 1. ✓
- Version bump + CHANGELOG → Task 2. ✓
- `formatGaelicScore` / screens unchanged (work via `goal`/`point` types + `SPORTS` iteration) → no task needed; asserted in spec. ✓

**Placeholder scan:** none — every step has concrete code/commands.

**Type consistency:** ids `'hurling'`/`'camogie'` used identically across the union, configs, `DEFAULT_HOME_KITS`, `TINTS`, and tests; card/scoring/stat `type` strings match between config and assertions (`card_black`, `65`, `45`, `two_pointer`).
