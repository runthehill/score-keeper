import { describe, it, expect } from 'vitest';
import { hexToRgb, rgba, relLuminance, inkOn, isPale, teamAccent } from './teamColors';

describe('teamColors', () => {
  it('hexToRgb handles 6- and 3-digit hex', () => {
    expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('#1E63D6')).toEqual({ r: 30, g: 99, b: 214 });
  });
  it('rgba formats', () => {
    expect(rgba('#000000', 0.5)).toBe('rgba(0,0,0,0.5)');
  });
  it('relLuminance: white≈1, black=0', () => {
    expect(relLuminance('#FFFFFF')).toBeCloseTo(1, 5);
    expect(relLuminance('#000000')).toBe(0);
  });
  it('inkOn: dark ink on pale, white ink on dark', () => {
    expect(inkOn('#FFFFFF')).toBe('#0C0E12');
    expect(inkOn('#15171C')).toBe('#FFFFFF');
  });
  it('isPale', () => {
    expect(isPale('#FFFFFF')).toBe(true);
    expect(isPale('#1E63D6')).toBe(false);
  });
  it('teamAccent picks a readable accent', () => {
    expect(teamAccent({ primary: '#E03131', secondary: '#FFFFFF' }, true)).toBe('#E03131');
    expect(teamAccent({ primary: '#15171C', secondary: '#FFFFFF' }, true)).toBe('#FFFFFF');
    expect(teamAccent({ primary: '#15171C', secondary: '#0C0E12' }, true)).toBe('#E8ECF2');
  });
});
