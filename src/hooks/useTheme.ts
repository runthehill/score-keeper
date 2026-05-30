import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'sk-theme';
// Dark is the deliberate default when the OS preference is unknown — it's the
// on-field default for sideline glare (and matches index.html's initial class).
const DEFAULT_DARK = true;

export function resolveInitialTheme(stored: string | null, systemDark: boolean): boolean {
  if (stored === 'dark') return true;
  if (stored === 'light') return false;
  return systemDark;
}

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : DEFAULT_DARK;
}

function applyTheme(dark: boolean): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('theme-dark', dark);
  root.classList.toggle('theme-light', !dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0C0E12' : '#EDEFF3');
}

export function useTheme(): { dark: boolean; toggle: () => void } {
  const [dark, setDark] = useState(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return resolveInitialTheme(stored, systemPrefersDark());
  });
  const userSet = useRef(typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) !== null);

  useEffect(() => {
    applyTheme(dark);
  }, [dark]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => {
      if (!userSet.current) setDark(e.matches);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const toggle = useCallback(() => {
    setDark((d) => {
      const next = !d;
      userSet.current = true;
      try {
        localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
      } catch {
        // localStorage unavailable — non-critical
      }
      return next;
    });
  }, []);

  return useMemo(() => ({ dark, toggle }), [dark, toggle]);
}

export interface ThemeContextValue {
  dark: boolean;
  toggle: () => void;
}

// Context + consumer hook live here (a non-component module) so the provider
// file can export only the component — satisfies react-refresh/only-export-components.
export const ThemeContext = createContext<ThemeContextValue>({ dark: true, toggle: () => {} });

export function useThemeContext(): ThemeContextValue {
  return useContext(ThemeContext);
}
