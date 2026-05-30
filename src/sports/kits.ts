import type { Sport } from '../types';

export interface Kit {
  name: string;
  primary: string;
  secondary: string;
}

export const KITS: Kit[] = [
  { name: 'Crimson', primary: '#E03131', secondary: '#FFFFFF' },
  { name: 'Royal', primary: '#1E63D6', secondary: '#FFFFFF' },
  { name: 'Forest', primary: '#1E8E4E', secondary: '#F4C430' },
  { name: 'Midnight', primary: '#16245A', secondary: '#E03131' },
  { name: 'Tangerine', primary: '#F25F1F', secondary: '#15171C' },
  { name: 'Sky', primary: '#2B9AD5', secondary: '#16245A' },
  { name: 'Maroon', primary: '#7A1F3D', secondary: '#E0A92E' },
  { name: 'Violet', primary: '#5B2A86', secondary: '#F4C430' },
  { name: 'Emerald', primary: '#0F9D72', secondary: '#FFFFFF' },
  { name: 'Slate', primary: '#15171C', secondary: '#FFFFFF' },
];

export const SWATCHES: string[] = [
  '#E03131', '#F25F1F', '#F59E0B', '#F4C430', '#86C61A', '#1E8E4E',
  '#0F9D72', '#0FB5B0', '#2B9AD5', '#1E63D6', '#16245A', '#5B2A86',
  '#A21CAF', '#D6336C', '#7A1F3D', '#8B5E34', '#15171C', '#FFFFFF',
];

export const DEFAULT_HOME_KIT = { primary: '#15171C', secondary: '#FFFFFF' };
export const DEFAULT_AWAY_KIT = { primary: '#1E63D6', secondary: '#FFFFFF' };

// Per-sport home kit colours (club identities). Away defaults to DEFAULT_AWAY_KIT.
export const DEFAULT_HOME_KITS: Record<Sport, { primary: string; secondary: string }> = {
  rugby_union: { primary: '#15171C', secondary: '#E03131' },
  soccer: { primary: '#1E8E4E', secondary: '#FFFFFF' },
  gaelic_football: { primary: '#E03131', secondary: '#FFFFFF' },
  basketball: { primary: '#F25F1F', secondary: '#15171C' },
};
