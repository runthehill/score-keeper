import type { Sport, SportConfig } from '../types';

export const SPORTS: SportConfig[] = [
  {
    id: 'rugby_union',
    name: 'Rugby Union',
    icon: '🏉',
    periods: { count: 2, name: 'Half' },
    scoreDisplay: 'single',
    scoringEvents: [
      { type: 'try', label: 'Try', points: 5, icon: '🏉' },
      { type: 'conversion', label: 'Conv', points: 2, icon: '🥅' },
      { type: 'penalty', label: 'Pen', points: 3, icon: '🦵' },
      { type: 'drop_goal', label: 'Drop', points: 3, icon: '🦶' },
    ],
    statEvents: [],
    cardEvents: [
      { type: 'card_yellow', label: 'Yellow Card', color: '#facc15' },
      { type: 'card_red', label: 'Red Card', color: '#ef4444' },
    ],
  },
  {
    id: 'soccer',
    name: 'Soccer',
    icon: '⚽',
    periods: { count: 2, name: 'Half' },
    scoreDisplay: 'single',
    scoringEvents: [
      { type: 'goal', label: 'Goal', points: 1, icon: '⚽' },
    ],
    statEvents: [
      { type: 'assist', label: 'Assist', icon: '👟' },
    ],
    cardEvents: [
      { type: 'card_yellow', label: 'Yellow Card', color: '#facc15' },
      { type: 'card_red', label: 'Red Card', color: '#ef4444' },
    ],
  },
  {
    id: 'gaelic_football',
    name: 'Gaelic Football',
    icon: '🟢',
    periods: { count: 2, name: 'Half' },
    scoreDisplay: 'split',
    scoringEvents: [
      { type: 'goal', label: 'Goal', points: 3, icon: '🥅' },
      { type: 'point', label: 'Point', points: 1, icon: '☝️' },
    ],
    statEvents: [],
    cardEvents: [
      { type: 'card_yellow', label: 'Yellow Card', color: '#facc15' },
      { type: 'card_black', label: 'Black Card', color: '#1a1a2e' },
      { type: 'card_red', label: 'Red Card', color: '#ef4444' },
    ],
  },
  {
    id: 'basketball',
    name: 'Basketball',
    icon: '🏀',
    periods: { count: 4, name: 'Quarter' },
    scoreDisplay: 'single',
    scoringEvents: [
      { type: 'free_throw', label: 'FT', points: 1, icon: '🏀' },
      { type: 'field_goal', label: '2PT', points: 2, icon: '🏀' },
      { type: 'three_pointer', label: '3PT', points: 3, icon: '🎯' },
    ],
    statEvents: [
      { type: 'rebound', label: 'Rebound', icon: '📊' },
      { type: 'steal', label: 'Steal', icon: '🤚' },
      { type: 'foul', label: 'Foul', icon: '⚠️' },
    ],
    cardEvents: [],
  },
];

export function getSportConfig(id: Sport): SportConfig {
  const config = SPORTS.find((s) => s.id === id);
  if (!config) throw new Error(`Unknown sport: ${id}`);
  return config;
}
