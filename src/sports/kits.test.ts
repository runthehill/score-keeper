import { describe, it, expect } from 'vitest';
import { KITS, SWATCHES, DEFAULT_HOME_KIT, DEFAULT_AWAY_KIT, DEFAULT_HOME_KITS } from './kits';

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
    const sports = ['rugby_union', 'soccer', 'gaelic_football', 'basketball'] as const;
    for (const s of sports) {
      const kit = DEFAULT_HOME_KITS[s];
      expect(kit.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(kit.secondary).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
