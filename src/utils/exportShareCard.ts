import { toPng } from 'html-to-image';
import { shareImage, type ShareOutcome } from './shareImage';

const PNG_OPTIONS = { pixelRatio: 2.5, backgroundColor: '#0A0C10' };

// Snapshot an on-screen node to a PNG, then share (Web Share API) or download.
//
// The share card uses condensed web fonts (Saira Condensed for the scores). On
// the very first html-to-image render those fonts can fall back to a taller
// system font before web-font embedding finishes, which renders the card taller
// than its measured box and crops the footer. Waiting for the document fonts and
// doing a discarded warm-up render first makes the real capture use the embedded
// fonts, so the whole card (footer included) is captured at the right size.
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
  // Warm-up render (result discarded) so fonts/resources are embedded for the real one.
  await toPng(node, PNG_OPTIONS).catch(() => {});
  const dataUrl = await toPng(node, PNG_OPTIONS);
  const blob = await (await fetch(dataUrl)).blob();
  return shareImage(blob, filename, meta);
}
