/* =========================================================================
   data.jsx — sports configs, team-color kits, helpers, seed games
   Score Keeper visual refresh — "Sideline"
   ========================================================================= */

// ---- Sports -------------------------------------------------------------
const SPORTS = [
  {
    id: 'rugby_union',
    name: 'Rugby Union',
    emoji: '🏉',
    glyph: 'rugby',
    blurb: 'Two halves · tries & kicks',
    periods: { count: 2, name: 'Half' },
    scoreDisplay: 'single',
    scoringEvents: [
      { type: 'try', label: 'Try', points: 5 },
      { type: 'conversion', label: 'Conv', points: 2 },
      { type: 'penalty', label: 'Pen', points: 3 },
      { type: 'drop_goal', label: 'Drop', points: 3 },
    ],
    statEvents: [],
    cardEvents: [
      { type: 'card_yellow', label: 'Yellow', color: '#f4c720' },
      { type: 'card_red', label: 'Red', color: '#ea493c' },
    ],
  },
  {
    id: 'soccer',
    name: 'Soccer',
    emoji: '⚽',
    glyph: 'soccer',
    blurb: 'Two halves · goals',
    periods: { count: 2, name: 'Half' },
    scoreDisplay: 'single',
    scoringEvents: [{ type: 'goal', label: 'Goal', points: 1 }],
    statEvents: [{ type: 'assist', label: 'Assist' }],
    cardEvents: [
      { type: 'card_yellow', label: 'Yellow', color: '#f4c720' },
      { type: 'card_red', label: 'Red', color: '#ea493c' },
    ],
  },
  {
    id: 'gaelic_football',
    name: 'Gaelic Football',
    emoji: null, // no clean emoji — uses the custom 'gaa' glyph
    glyph: 'gaa',
    blurb: 'Goals & points · 1-05',
    periods: { count: 2, name: 'Half' },
    scoreDisplay: 'split', // goals-points e.g. 1-05
    scoringEvents: [
      { type: 'point', label: 'Point', points: 1, sub: '+0-01' },
      { type: 'two_pointer', label: 'Two', points: 2, sub: '+0-02' },
      { type: 'goal', label: 'Goal', points: 3, sub: '+1-00' },
    ],
    statEvents: [],
    cardEvents: [
      { type: 'card_yellow', label: 'Yellow', color: '#f4c720' },
      { type: 'card_black', label: 'Black', color: '#15171c' },
      { type: 'card_red', label: 'Red', color: '#ea493c' },
    ],
  },
  {
    id: 'basketball',
    name: 'Basketball',
    emoji: '🏀',
    glyph: 'basket',
    blurb: 'Four quarters · FT/2/3',
    periods: { count: 4, name: 'Quarter' },
    scoreDisplay: 'single',
    scoringEvents: [
      { type: 'free_throw', label: 'FT', points: 1 },
      { type: 'field_goal', label: '2PT', points: 2 },
      { type: 'three_pointer', label: '3PT', points: 3 },
    ],
    statEvents: [
      { type: 'rebound', label: 'Rebound' },
      { type: 'steal', label: 'Steal' },
      { type: 'foul', label: 'Foul' },
    ],
    cardEvents: [],
  },
];

const getSport = (id) => SPORTS.find((s) => s.id === id);

// ---- Team color "kits" --------------------------------------------------
// A kit = primary + secondary. These are the named presets shown first.
const KITS = [
  { name: 'Crimson',  primary: '#E03131', secondary: '#FFFFFF' },
  { name: 'Royal',    primary: '#1E63D6', secondary: '#FFFFFF' },
  { name: 'Forest',   primary: '#1E8E4E', secondary: '#F4C430' },
  { name: 'Midnight', primary: '#16245A', secondary: '#E03131' },
  { name: 'Tangerine',primary: '#F25F1F', secondary: '#15171C' },
  { name: 'Sky',      primary: '#2B9AD5', secondary: '#16245A' },
  { name: 'Maroon',   primary: '#7A1F3D', secondary: '#E0A92E' },
  { name: 'Violet',   primary: '#5B2A86', secondary: '#F4C430' },
  { name: 'Emerald',  primary: '#0F9D72', secondary: '#FFFFFF' },
  { name: 'Slate',    primary: '#15171C', secondary: '#FFFFFF' },
];

// Full swatch palette for fine-grained custom picking
const SWATCHES = [
  '#E03131', '#F25F1F', '#F59E0B', '#F4C430', '#86C61A', '#1E8E4E',
  '#0F9D72', '#0FB5B0', '#2B9AD5', '#1E63D6', '#16245A', '#5B2A86',
  '#A21CAF', '#D6336C', '#7A1F3D', '#8B5E34', '#15171C', '#FFFFFF',
];

// ---- Color helpers ------------------------------------------------------
function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgba(hex, a) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
function relLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
// Best-contrast ink (black/white) for text drawn ON a given color
function inkOn(hex) {
  return relLuminance(hex) > 0.42 ? '#0C0E12' : '#FFFFFF';
}
// Is this a pale color that needs a hairline border to read on dark/light bg?
function isPale(hex) {
  return relLuminance(hex) > 0.7;
}
// Mix a hex toward black or white by t (0..1)
function shade(hex, t) {
  const { r, g, b } = hexToRgb(hex);
  const to = t < 0 ? 0 : 255;
  const k = Math.abs(t);
  const m = (c) => Math.round(c + (to - c) * k);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}

// ---- Format helpers -----------------------------------------------------
const pad2 = (n) => String(n).padStart(2, '0');
function fmtTimer(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${pad2(m)}:${pad2(s)}`;
}
// Gaelic split score: goals-points from a point total isn't recoverable,
// so we track goals & points separately in events. Helper computes G-PP.
function gaelicSplit(events, team) {
  let goals = 0, points = 0;
  for (const e of events) {
    if (e.team !== team) continue;
    if (e.type === 'goal') goals += 1;
    else if (e.type === 'two_pointer') points += 2;
    else if (e.type === 'point') points += 1;
  }
  return `${goals}-${pad2(points)}`;
}
function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function relDay(iso) {
  const d = new Date(iso);
  const now = new Date();
  const days = Math.round((now - d) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return fmtDate(iso);
}

// ---- Seed games (recent history) ---------------------------------------
const SEED_GAMES = [
  {
    id: 'g-soccer-1', sport: 'soccer', status: 'completed',
    home: { name: 'Strand Celtic', primary: '#1E8E4E', secondary: '#FFFFFF' },
    away: { name: 'Rovers AFC', primary: '#1E63D6', secondary: '#F4C430' },
    homeScore: 3, awayScore: 2,
    started_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    periodName: 'Half', periodCount: 2,
  },
  {
    id: 'g-rugby-1', sport: 'rugby_union', status: 'completed',
    home: { name: 'Sligo RFC', primary: '#15171C', secondary: '#E03131' },
    away: { name: 'Ballina', primary: '#1E63D6', secondary: '#FFFFFF' },
    homeScore: 24, awayScore: 17,
    started_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    periodName: 'Half', periodCount: 2,
  },
  {
    id: 'g-basket-1', sport: 'basketball', status: 'completed',
    home: { name: 'Sligo All Stars', primary: '#F25F1F', secondary: '#15171C' },
    away: { name: 'Tubbercurry', primary: '#7A1F3D', secondary: '#E0A92E' },
    homeScore: 58, awayScore: 61,
    started_at: new Date(Date.now() - 9 * 86400000).toISOString(),
    periodName: 'Quarter', periodCount: 4,
  },
];

Object.assign(window, {
  SPORTS, getSport, KITS, SWATCHES, SEED_GAMES,
  hexToRgb, rgba, relLuminance, inkOn, isPale, shade,
  fmtTimer, gaelicSplit, fmtDate, relDay, pad2,
});
