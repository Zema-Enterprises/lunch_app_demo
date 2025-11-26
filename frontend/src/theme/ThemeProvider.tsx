import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useCompanyTheme } from '@/lib/api/hooks';
import { CompanyTheme } from '@/types';
import { DEFAULT_THEME } from './constants';
import { applyThemeVariables, mergeWithDefaultTheme } from './utils';

type ThemeContextValue = {
  theme: CompanyTheme;
  isLoading: boolean;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  isLoading: false,
});

const loadCachedTheme = (): CompanyTheme => {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    const raw = window.localStorage.getItem('ls-theme-cache');
    if (!raw) return DEFAULT_THEME;
    return mergeWithDefaultTheme(JSON.parse(raw));
  } catch {
    return DEFAULT_THEME;
  }
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, isLoading } = useCompanyTheme();
  const [currentTheme, setCurrentTheme] = useState<CompanyTheme>(() => loadCachedTheme());

  useEffect(() => {
    if (data) {
      const merged = mergeWithDefaultTheme(data);
      setCurrentTheme(merged);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('ls-theme-cache', JSON.stringify(merged));
        } catch {
          // ignore cache write failures
        }
      }
    }
  }, [data]);

  const effectiveTheme = currentTheme;

  useEffect(() => {
    applyThemeVariables(effectiveTheme);
  }, [effectiveTheme]);

  const value = useMemo(
    () => ({
      theme: effectiveTheme,
      isLoading,
    }),
    [effectiveTheme, isLoading]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeContext = () => useContext(ThemeContext);
