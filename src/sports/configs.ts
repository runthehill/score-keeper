import type { Sport, SportConfig } from '../types'

export const SPORTS: SportConfig[] = [
  {
    id: 'rugby_union',
    name: 'Rugby Union',
    icon: '🏉',
    periods: { count: 2, name: 'Half' },
    extraPeriods: [{ type: 'extra_time', label: 'Extra Time' }],
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
    extraPeriods: [
      { type: 'extra_time', label: 'Extra Time' },
      { type: 'penalties', label: 'Penalties' },
    ],
    scoreDisplay: 'single',
    scoringEvents: [{ type: 'goal', label: 'Goal', points: 1, icon: '⚽' }],
    statEvents: [
      { type: 'assist', label: 'Assist', icon: '👟' },
      { type: 'throw_in', label: 'Throw-in', icon: '🤾' },
      { type: 'corner', label: 'Corner', icon: '🚩' },
      { type: 'offside', label: 'Off-side', icon: '🚫' },
      { type: 'penalty', label: 'Penalty', icon: '🎯' },
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
    extraPeriods: [{ type: 'extra_time', label: 'Extra Time' }],
    scoreDisplay: 'split',
    scoringEvents: [
      { type: 'point', label: 'Point', points: 1, icon: '☝️', color: '#e5e7eb' },
      { type: 'two_pointer', label: 'Two-Pointer', points: 2, icon: '🟠', color: '#f97316' },
      { type: 'goal', label: 'Goal', points: 3, icon: '🥅', color: '#22c55e' },
      { type: 'wide', label: 'Wide', points: 0, icon: '🚩' },
    ],
    statEvents: [
      { type: 'penalty', label: 'Penalty', icon: '🎯' },
      { type: '45', label: '45', icon: '🦵' },
    ],
    cardEvents: [
      { type: 'card_yellow', label: 'Yellow Card', color: '#facc15' },
      { type: 'card_black', label: 'Black Card', color: '#1a1a2e' },
      { type: 'card_red', label: 'Red Card', color: '#ef4444' },
    ],
  },
  {
    id: 'hurling',
    name: 'Hurling',
    icon: '🔵',
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
  {
    id: 'basketball',
    name: 'Basketball',
    icon: '🏀',
    periods: { count: 4, name: 'Quarter' },
    periodOptions: [
      { count: 2, name: 'Half' },
      { count: 4, name: 'Quarter' },
    ],
    extraPeriods: [{ type: 'overtime', label: 'Overtime' }],
    scoreDisplay: 'single',
    scoringEvents: [
      { type: 'free_throw', label: 'FT', points: 1, icon: '🏀', miss: { type: 'free_throw_miss', label: 'Missed FT' } },
      { type: 'field_goal', label: '2PT', points: 2, icon: '🏀', miss: { type: 'field_goal_miss', label: 'Missed 2PT' } },
      { type: 'three_pointer', label: '3PT', points: 3, icon: '🎯', miss: { type: 'three_pointer_miss', label: 'Missed 3PT' } },
    ],
    statEvents: [
      { type: 'assist', label: 'Assist', icon: '👟' },
      { type: 'off_rebound', label: 'Oreb', icon: '📈' },
      { type: 'def_rebound', label: 'Dreb', icon: '🛡️' },
      { type: 'steal', label: 'Steal', icon: '🤚' },
      { type: 'foul', label: 'Foul', icon: '⚠️' },
      { type: 'turnover', label: 'TO', icon: '🔄' },
    ],
    cardEvents: [],
  },
]

export function getSportConfig(id: Sport): SportConfig {
  const config = SPORTS.find((s) => s.id === id)
  if (!config) throw new Error(`Unknown sport: ${id}`)
  return config
}
