import { downloadFile } from './export';

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled' | 'error';

interface ShareMeta {
  title: string;
  text: string;
}

export async function shareImage(blob: Blob, filename: string, meta: ShareMeta): Promise<ShareOutcome> {
  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };

  if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: meta.title, text: meta.text });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
      // any other share error → fall through to download
    }
  }

  try {
    downloadFile(blob, filename, 'image/png');
    return 'downloaded';
  } catch {
    return 'error';
  }
}
