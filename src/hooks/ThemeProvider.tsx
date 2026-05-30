import type { ReactNode } from 'react';
import { useTheme, ThemeContext } from './useTheme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
