import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('html-to-image', () => ({ toPng: vi.fn() }));
vi.mock('./shareImage', () => ({ shareImage: vi.fn() }));

import { toPng } from 'html-to-image';
import { shareImage } from './shareImage';
import { exportShareCard } from './exportShareCard';

const mockToPng = vi.mocked(toPng);
const mockShareImage = vi.mocked(shareImage);

describe('exportShareCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('snapshots the node to a PNG blob and forwards it to shareImage', async () => {
    const pngBlob = new Blob(['png'], { type: 'image/png' });
    mockToPng.mockResolvedValue('data:image/png;base64,AAAA');
    globalThis.fetch = vi.fn().mockResolvedValue({ blob: () => Promise.resolve(pngBlob) }) as unknown as typeof fetch;
    mockShareImage.mockResolvedValue('shared');

    const node = document.createElement('div');
    const outcome = await exportShareCard(node, 'game.png', { title: 'T', text: 'X' });

    expect(mockToPng).toHaveBeenCalledWith(node, expect.objectContaining({ backgroundColor: '#0A0C10' }));
    expect(mockToPng).toHaveBeenCalledTimes(2); // warm-up render + the real one
    expect(mockShareImage).toHaveBeenCalledWith(pngBlob, 'game.png', { title: 'T', text: 'X' });
    expect(outcome).toBe('shared');
  });

  // Bug: html-to-image rasterises the card a few px taller than its measured box,
  // clipping the footer. The export must capture with vertical headroom past the
  // measured height so the whole card (footer included) is included.
  it('captures with vertical headroom beyond the measured height', async () => {
    mockToPng.mockResolvedValue('data:image/png;base64,AAAA');
    globalThis.fetch = vi.fn().mockResolvedValue({ blob: () => Promise.resolve(new Blob()) }) as unknown as typeof fetch;
    mockShareImage.mockResolvedValue('downloaded');

    const node = document.createElement('div');
    node.getBoundingClientRect = () =>
      ({ width: 300, height: 200, top: 0, left: 0, right: 300, bottom: 200, x: 0, y: 0, toJSON() {} }) as DOMRect;

    await exportShareCard(node, 'game.png', { title: 'T', text: 'X' });

    const lastOpts = mockToPng.mock.calls.at(-1)![1] as { width?: number; height?: number };
    expect(lastOpts.width).toBe(300);
    expect(lastOpts.height).toBeGreaterThan(200);
  });

  it('propagates a capture failure (so callers can surface an error)', async () => {
    mockToPng.mockRejectedValue(new Error('capture failed'));
    const node = document.createElement('div');
    await expect(exportShareCard(node, 'game.png', { title: 'T', text: 'X' })).rejects.toThrow('capture failed');
    expect(mockShareImage).not.toHaveBeenCalled();
  });
});
