import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { resolveInitialTheme, useTheme } from './useTheme';

function mockMatchMedia(matches: boolean) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  const mql = {
    matches,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
    dispatch: (m: boolean) => listeners.forEach((cb) => cb({ matches: m } as MediaQueryListEvent)),
  };
  window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia;
  return mql;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
});
afterEach(() => vi.restoreAllMocks());

describe('resolveInitialTheme', () => {
  it('uses a stored override over the system', () => {
    expect(resolveInitialTheme('dark', false)).toBe(true);
    expect(resolveInitialTheme('light', true)).toBe(false);
  });
  it('falls back to the system when nothing stored', () => {
    expect(resolveInitialTheme(null, true)).toBe(true);
    expect(resolveInitialTheme(null, false)).toBe(false);
  });
});

describe('useTheme', () => {
  it('applies theme-dark from the system and no stored override', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useTheme());
    expect(result.current.dark).toBe(true);
    expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
  });

  it('toggle flips, persists, and applies the class', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggle());
    expect(result.current.dark).toBe(false);
    expect(localStorage.getItem('sk-theme')).toBe('light');
    expect(document.documentElement.classList.contains('theme-light')).toBe(true);
  });

  it('honours a stored override over the system', () => {
    localStorage.setItem('sk-theme', 'light');
    mockMatchMedia(true);
    const { result } = renderHook(() => useTheme());
    expect(result.current.dark).toBe(false);
  });

  it('follows system changes until the user overrides', () => {
    const mql = mockMatchMedia(true);
    const { result } = renderHook(() => useTheme());
    act(() => mql.dispatch(false));
    expect(result.current.dark).toBe(false);
    act(() => result.current.toggle());
    act(() => mql.dispatch(false));
    expect(result.current.dark).toBe(true);
  });
});
