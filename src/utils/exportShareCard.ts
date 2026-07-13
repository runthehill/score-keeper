import { toPng } from 'html-to-image';
import { shareImage, type ShareOutcome } from './shareImage';

const PNG_OPTIONS = { pixelRatio: 2.5, backgroundColor: '#0A0C10' };

// Snapshot an on-screen node to a PNG, then share (Web Share API) or download.
//
// html-to-image rasterises the card's foreignObject a few pixels taller than the
// node's measured box (per-line box rounding accumulates down the card), and it
// pins the capture to that measured height — so the bottom footer row was being
// clipped. We instead capture at the node's own width plus vertical headroom,
// filled with the card background (#0A0C10), so the whole card is always included
// regardless of the raster's exact line metrics. The font warm-up is still useful:
// waiting for document fonts + a discarded first render embeds the web fonts so
// the real capture uses them rather than a taller system fallback.
export async function exportShareCard(
  node: HTMLElement,
  filename: string,
  meta: { title: string; text: string }
): Promise<ShareOutcome> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Font Loading API unavailable — fall through; the warm-up render still helps.
    }
  }
  const rect = node.getBoundingClientRect();
  const opts =
    rect.height > 0
      ? { ...PNG_OPTIONS, width: Math.ceil(rect.width), height: Math.ceil(rect.height + Math.max(24, rect.height * 0.1)) }
      : PNG_OPTIONS;
  // Warm-up render (result discarded) so fonts/resources are embedded for the real one.
  await toPng(node, opts).catch(() => {});
  const dataUrl = await toPng(node, opts);
  const blob = await (await fetch(dataUrl)).blob();
  return shareImage(blob, filename, meta);
}
