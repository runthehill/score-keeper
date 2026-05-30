export interface RGB { r: number; g: number; b: number; }

export function hexToRgb(hex: string): RGB {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgba(hex: string, a: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

export function relLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const f = (v: number): number => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

// Best-contrast ink (near-black / white) for text drawn ON a given colour.
export function inkOn(hex: string): string {
  return relLuminance(hex) > 0.42 ? '#0C0E12' : '#FFFFFF';
}

// A pale colour that needs a hairline to read on the bg.
export function isPale(hex: string): boolean {
  return relLuminance(hex) > 0.7;
}

// Theme-aware accent for UI tint: the kit colour that reads against the bg, else a neutral.
export function teamAccent(team: { primary: string; secondary: string }, dark: boolean): string {
  const bgL = relLuminance(dark ? '#0C0E12' : '#EDEFF3');
  const ratio = (c: string): number => {
    const cl = relLuminance(c);
    return (Math.max(cl, bgL) + 0.05) / (Math.min(cl, bgL) + 0.05);
  };
  if (ratio(team.primary) >= 2.3) return team.primary;
  if (ratio(team.secondary) >= 2.3) return team.secondary;
  return dark ? '#E8ECF2' : '#15171C';
}
