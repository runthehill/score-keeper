import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { shareImage } from './shareImage';

const blob = new Blob(['x'], { type: 'image/png' });
const meta = { title: 'A v B', text: 'A 1 - 0 B' };

beforeEach(() => {
  (URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn(() => 'blob:mock');
  (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
});

afterEach(() => {
  delete (navigator as { share?: unknown }).share;
  delete (navigator as { canShare?: unknown }).canShare;
  vi.restoreAllMocks();
});

describe('shareImage', () => {
  it('uses Web Share when files are shareable', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    (navigator as { share?: unknown }).share = share;
    (navigator as { canShare?: unknown }).canShare = vi.fn(() => true);
    const outcome = await shareImage(blob, 'card.png', meta);
    expect(outcome).toBe('shared');
    expect(share).toHaveBeenCalledOnce();
    expect(share.mock.calls[0][0].files[0]).toBeInstanceOf(File);
  });

  it('returns cancelled when the user aborts the share sheet', async () => {
    (navigator as { share?: unknown }).share = vi.fn().mockRejectedValue(
      Object.assign(new Error('user abort'), { name: 'AbortError' })
    );
    (navigator as { canShare?: unknown }).canShare = vi.fn(() => true);
    const outcome = await shareImage(blob, 'card.png', meta);
    expect(outcome).toBe('cancelled');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('downloads when Web Share for files is unavailable', async () => {
    const outcome = await shareImage(blob, 'card.png', meta);
    expect(outcome).toBe('downloaded');
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('falls back to download on a non-abort share error', async () => {
    (navigator as { share?: unknown }).share = vi.fn().mockRejectedValue(new Error('boom'));
    (navigator as { canShare?: unknown }).canShare = vi.fn(() => true);
    const outcome = await shareImage(blob, 'card.png', meta);
    expect(outcome).toBe('downloaded');
    expect(URL.createObjectURL).toHaveBeenCalled();
  });
});
