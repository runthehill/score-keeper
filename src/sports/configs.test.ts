import { describe, it, expect } from 'vitest';
import { SPORTS, getSportConfig } from './configs';

describe('sport configs', () => {
  it('defines exactly 4 sports', () => {
    expect(SPORTS).toHaveLength(4);
  });

  it.each(['rugby_union', 'soccer', 'gaelic_football', 'basketball'] as const)(
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

  it('basketball has stat events for rebounds and steals', () => {
    const config = getSportConfig('basketball');
    expect(config.statEvents.find((e) => e.type === 'rebound')).toBeDefined();
    expect(config.statEvents.find((e) => e.type === 'steal')).toBeDefined();
  });

  it('gaelic football has black card', () => {
    const config = getSportConfig('gaelic_football');
    expect(config.cardEvents.find((e) => e.type === 'card_black')).toBeDefined();
  });

  it('all scoring events have positive points', () => {
    for (const sport of SPORTS) {
      for (const event of sport.scoringEvents) {
        expect(event.points, `${sport.id}.${event.type}`).toBeGreaterThan(0);
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
