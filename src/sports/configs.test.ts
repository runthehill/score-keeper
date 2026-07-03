import { describe, it, expect } from 'vitest';
import { SPORTS, getSportConfig } from './configs';

describe('sport configs', () => {
  it('defines exactly 6 sports', () => {
    expect(SPORTS).toHaveLength(6);
  });

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

  it('rugby union has correct scoring values', () => {
    const config = getSportConfig('rugby_union');
    const tryEvent = config.scoringEvents.find((e) => e.type === 'try');
    const conversion = config.scoringEvents.find((e) => e.type === 'conversion');
    const penalty = config.scoringEvents.find((e) => e.type === 'penalty');
    const dropGoal = config.scoringEvents.find((e) => e.type === 'drop_goal');
    expect(tryEvent?.points).toBe(5);
    expect(conversion?.points).toBe(2);
    expect(penalty?.points).toBe(3);
    expect(dropGoal?.points).toBe(3);
  });

  it('gaelic football uses split score display', () => {
    const config = getSportConfig('gaelic_football');
    expect(config.scoreDisplay).toBe('split');
    const goal = config.scoringEvents.find((e) => e.type === 'goal');
    const point = config.scoringEvents.find((e) => e.type === 'point');
    const twoPointer = config.scoringEvents.find((e) => e.type === 'two_pointer');
    expect(goal?.points).toBe(3);
    expect(point?.points).toBe(1);
    expect(twoPointer?.points).toBe(2);
    expect(twoPointer?.label).toBe('Two-Pointer');
  });

  it('gaelic football scoring events carry umpire flag colors', () => {
    const config = getSportConfig('gaelic_football');
    const colorOf = (type: string) =>
      config.scoringEvents.find((e) => e.type === type)?.color;
    expect(colorOf('goal')).toBe('#22c55e'); // green flag
    expect(colorOf('point')).toBe('#e5e7eb'); // white flag
    expect(colorOf('two_pointer')).toBe('#f97316'); // orange flag
  });

  it('orders gaelic football scoring buttons point, two-pointer, goal, wide', () => {
    const config = getSportConfig('gaelic_football');
    expect(config.scoringEvents.map((e) => e.type)).toEqual(['point', 'two_pointer', 'goal', 'wide']);
  });

  it('basketball has stat events for rebounds and steals', () => {
    const config = getSportConfig('basketball');
    expect(config.statEvents.find((e) => e.type === 'off_rebound')).toBeDefined();
    expect(config.statEvents.find((e) => e.type === 'def_rebound')).toBeDefined();
    expect(config.statEvents.find((e) => e.type === 'steal')).toBeDefined();
  });

  it('gaelic football has black card', () => {
    const config = getSportConfig('gaelic_football');
    expect(config.cardEvents.find((e) => e.type === 'card_black')).toBeDefined();
  });

  it('all scoring events have non-negative points', () => {
    for (const sport of SPORTS) {
      for (const event of sport.scoringEvents) {
        expect(event.points, `${sport.id}.${event.type}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('basketball has period options for halves and quarters', () => {
    const config = getSportConfig('basketball');
    expect(config.periodOptions).toBeDefined();
    expect(config.periodOptions).toHaveLength(2);
    expect(config.periodOptions!.find((o) => o.name === 'Half')).toBeDefined();
    expect(config.periodOptions!.find((o) => o.name === 'Quarter')).toBeDefined();
  });

  it('soccer has extra time and penalties', () => {
    const config = getSportConfig('soccer');
    expect(config.extraPeriods.find((e) => e.type === 'extra_time')).toBeDefined();
    expect(config.extraPeriods.find((e) => e.type === 'penalties')).toBeDefined();
  });

  it('basketball has overtime', () => {
    const config = getSportConfig('basketball');
    expect(config.extraPeriods.find((e) => e.type === 'overtime')).toBeDefined();
  });

  it('all sports have extraPeriods array', () => {
    for (const sport of SPORTS) {
      expect(Array.isArray(sport.extraPeriods), `${sport.id}.extraPeriods`).toBe(true);
    }
  });
});

describe('sport configs — stat tracking', () => {
  it('Gaelic has a 0-point Wide as a 4th scoring button', () => {
    const g = getSportConfig('gaelic_football');
    expect(g.scoringEvents).toHaveLength(4);
    const wide = g.scoringEvents.find((e) => e.type === 'wide');
    expect(wide).toBeDefined();
    expect(wide?.points).toBe(0);
  });
  it('Gaelic tracks a penalty stat', () => {
    expect(getSportConfig('gaelic_football').statEvents.map((s) => s.type)).toContain('penalty');
  });
  it('Gaelic tracks a 45 stat alongside the penalty', () => {
    const types = getSportConfig('gaelic_football').statEvents.map((s) => s.type);
    expect(types).toEqual(expect.arrayContaining(['penalty', '45']));
  });
  it('Basketball tracks an assist stat', () => {
    const types = getSportConfig('basketball').statEvents.map((s) => s.type);
    expect(types).toContain('assist');
  });
  it("Gaelic 45 label is 45 (no prime)", () => {
    const forty5 = getSportConfig('gaelic_football').statEvents.find((s) => s.type === '45');
    expect(forty5?.label).toBe('45');
  });
  it('Basketball splits rebound into Oreb and Dreb, and has a turnover', () => {
    const types = getSportConfig('basketball').statEvents.map((s) => s.type);
    expect(types).toEqual(expect.arrayContaining(['off_rebound', 'def_rebound', 'turnover']));
    expect(types).not.toContain('rebound');
  });
  it('Basketball scoring buttons carry miss descriptors', () => {
    const cfg = getSportConfig('basketball');
    const miss = (t: string) => cfg.scoringEvents.find((e) => e.type === t)?.miss;
    expect(miss('free_throw')).toEqual({ type: 'free_throw_miss', label: 'Missed FT' });
    expect(miss('field_goal')).toEqual({ type: 'field_goal_miss', label: 'Missed 2PT' });
    expect(miss('three_pointer')).toEqual({ type: 'three_pointer_miss', label: 'Missed 3PT' });
  });
  it('Soccer tracks assist, throw-in, corner, off-side, penalty', () => {
    const types = getSportConfig('soccer').statEvents.map((s) => s.type);
    expect(types).toEqual(expect.arrayContaining(['assist', 'throw_in', 'corner', 'offside', 'penalty']));
  });
});

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
