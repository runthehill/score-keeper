import type { ShareModel, ShareTeam } from './shareCard';

export type ShareFormat = 'square' | 'story';

export const CARD_SIZES: Record<ShareFormat, { w: number; h: number }> = {
  square: { w: 1080, h: 1080 },
  story: { w: 1080, h: 1920 },
};

const HOME_DOT = '#60a5fa';
const AWAY_DOT = '#fbbf24';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Shrink the font from baseSize toward minSize until the text fits maxWidth; then ellipsize.
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, baseSize: number, minSize: number): { text: string; size: number } {
  let size = baseSize;
  while (size > minSize) {
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) return { text, size };
    size -= 4;
  }
  ctx.font = `800 ${minSize}px system-ui, sans-serif`;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return { text: t.length < text.length ? `${t}…` : t, size: minSize };
}

function drawTeam(ctx: CanvasRenderingContext2D, team: ShareTeam, w: number, y: number, dotColor: string, dimmed: boolean, maxNameWidth: number): void {
  ctx.save();
  ctx.globalAlpha = dimmed ? 0.82 : 1;

  // Name row (optional trophy prefix), auto-fit, with a leading team-colour dot.
  const label = `${team.isWinner ? '🏆 ' : ''}${team.name}`;
  const fitted = fitText(ctx, label, maxNameWidth - w * 0.06, w * 0.05, w * 0.03);
  ctx.font = `800 ${fitted.size}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const nameWidth = ctx.measureText(fitted.text).width;
  const dotR = w * 0.013;
  const gap = w * 0.022;
  const startX = (w - (dotR * 2 + gap + nameWidth)) / 2;
  const nameY = y - w * 0.05;

  ctx.beginPath();
  ctx.fillStyle = dotColor;
  ctx.arc(startX + dotR, nameY, dotR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillText(fitted.text, startX + dotR * 2 + gap, nameY);

  // Score (large, centred).
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${w * 0.12}px system-ui, sans-serif`;
  ctx.fillText(team.score, w / 2, y + w * 0.055);

  ctx.restore();
}

export function renderScoreCard(canvas: HTMLCanvasElement, model: ShareModel, format: ShareFormat): void {
  const { w, h } = CARD_SIZES[format];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background gradient (Direction B).
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#2563eb');
  g.addColorStop(0.55, '#1e3a5f');
  g.addColorStop(1, '#0f0f23');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Status pill (top).
  const pillY = h * (format === 'story' ? 0.16 : 0.18);
  const pillText = model.isLive
    ? `● LIVE${model.statusLabel ? `   ${model.statusLabel.toUpperCase()}` : ''}`
    : model.statusLabel;
  ctx.font = `800 ${w * 0.034}px system-ui, sans-serif`;
  const pillW = ctx.measureText(pillText).width + w * 0.08;
  const pillH = w * 0.085;
  roundRect(ctx, (w - pillW) / 2, pillY - pillH / 2, pillW, pillH, pillH / 2);
  ctx.fillStyle = model.isLive ? 'rgba(239,68,68,0.22)' : 'rgba(255,255,255,0.16)';
  ctx.fill();
  ctx.fillStyle = model.isLive ? '#fecaca' : '#ffffff';
  ctx.fillText(pillText, w / 2, pillY);

  // Teams (stacked, centred). Loser dimmed only on a decided final.
  const centerY = h * 0.5;
  const blockGap = h * (format === 'story' ? 0.18 : 0.19);
  const decided = !model.isLive && !model.isDraw;
  drawTeam(ctx, model.home, w, centerY - blockGap / 2, HOME_DOT, decided && !model.home.isWinner, w * 0.82);
  drawTeam(ctx, model.away, w, centerY + blockGap / 2, AWAY_DOT, decided && !model.away.isWinner, w * 0.82);

  // Footer (two lines).
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.font = `600 ${w * 0.028}px system-ui, sans-serif`;
  const footY = h * (format === 'story' ? 0.9 : 0.88);
  ctx.fillText(`${model.sportIcon}  ${model.sport}   ·   ${model.dateLabel}`, w / 2, footY);
  ctx.fillText(`${model.appName}   ·   ${model.appUrl}`, w / 2, footY + w * 0.05);
}

export function cardToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Failed to create image'))), 'image/png');
  });
}
