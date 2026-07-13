import { describe, it, expect } from 'vitest';
import { KITS, SWATCHES, DEFAULT_HOME_KIT, DEFAULT_AWAY_KIT, DEFAULT_HOME_KITS, squadKit } from './kits';
import { SPORTS } from './configs';
import type { DefaultSquad } from '../types';

describe('kits', () => {
  it('has 10 named kits, each with hex primary + secondary', () => {
    expect(KITS).toHaveLength(10);
    for (const k of KITS) {
      expect(k.name).toBeTruthy();
      expect(k.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(k.secondary).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
  it('has 18 swatches', () => {
    expect(SWATCHES).toHaveLength(18);
  });
  it('exposes sensible defaults', () => {
    expect(DEFAULT_HOME_KIT).toEqual({ primary: '#15171C', secondary: '#FFFFFF' });
    expect(DEFAULT_AWAY_KIT).toEqual({ primary: '#1E63D6', secondary: '#FFFFFF' });
  });
});

describe('per-sport home kits', () => {
  it('has a hex kit for every sport', () => {
    // Derived from SPORTS so new sports are covered automatically (no stale hard-coded list).
    for (const { id } of SPORTS) {
      const kit = DEFAULT_HOME_KITS[id];
      expect(kit.primary, id).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(kit.secondary, id).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  // Home and away should never default to the same colour (Hurling regressed to royal blue on both).
  it('gives every sport a home kit distinct from the away default', () => {
    for (const { id } of SPORTS) {
      expect(DEFAULT_HOME_KITS[id].primary, id).not.toBe(DEFAULT_AWAY_KIT.primary);
    }
  });
});

describe('squadKit', () => {
  it('returns the squad colours when both are set', () => {
    const squad: DefaultSquad = { teamName: 'X', players: [], primary: '#111111', secondary: '#222222' };
    expect(squadKit(squad, 'soccer')).toEqual({ primary: '#111111', secondary: '#222222' });
  });
  it('falls back to the sport default when colours are missing or the squad is undefined', () => {
    expect(squadKit({ teamName: 'X', players: [] }, 'rugby_union')).toEqual(DEFAULT_HOME_KITS.rugby_union);
    expect(squadKit(undefined, 'soccer')).toEqual(DEFAULT_HOME_KITS.soccer);
  });
});
