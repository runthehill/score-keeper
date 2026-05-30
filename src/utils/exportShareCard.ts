import { toPng } from 'html-to-image';
import { shareImage, type ShareOutcome } from './shareImage';

// Snapshot an on-screen node to a PNG, then share (Web Share API) or download.
export async function exportShareCard(
  node: HTMLElement,
  filename: string,
  meta: { title: string; text: string }
): Promise<ShareOutcome> {
  const dataUrl = await toPng(node, { pixelRatio: 2.5, cacheBust: true, backgroundColor: '#0A0C10' });
  const blob = await (await fetch(dataUrl)).blob();
  return shareImage(blob, filename, meta);
}
