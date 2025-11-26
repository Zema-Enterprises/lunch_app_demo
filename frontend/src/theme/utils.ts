import { CompanyTheme } from '@/types';
import { DEFAULT_THEME } from './constants';

const apiBase = import.meta.env.VITE_API_URL || '/api';
const apiOrigin = apiBase.startsWith('http')
  ? new URL(apiBase).origin
  : window.location.origin;

export const resolveAssetUrl = (url?: string | null) => {
  if (!url) return null;
  if (/^(blob:|data:)/i.test(url)) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return `${apiOrigin}${url}`;
};

const normalizeColor = (value?: string) => (value ? value.toLowerCase() : undefined);

export const mergeWithDefaultTheme = (theme?: Partial<CompanyTheme>): CompanyTheme => ({
  ...DEFAULT_THEME,
  ...theme,
  primaryColor: normalizeColor(theme?.primaryColor) || DEFAULT_THEME.primaryColor,
  secondaryColor: normalizeColor(theme?.secondaryColor) || DEFAULT_THEME.secondaryColor,
  backgroundColor: normalizeColor(theme?.backgroundColor) || DEFAULT_THEME.backgroundColor,
});

export const applyThemeVariables = (theme: CompanyTheme) => {
  const root = document.documentElement;

  root.style.setProperty('--ls-primary', theme.primaryColor);
  root.style.setProperty('--ls-secondary', theme.secondaryColor);
  root.style.setProperty('--ls-background', theme.backgroundColor);

  const resolvedCover = resolveAssetUrl(theme.coverPhotoUrl);
  if (resolvedCover) {
    root.style.setProperty('--ls-cover-url', `url("${resolvedCover}")`);
  } else {
    root.style.removeProperty('--ls-cover-url');
  }
};

export const isColorDark = (hex?: string) => {
  if (!hex || !/^#([0-9a-fA-F]{6})$/.test(hex)) return false;
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 0.55;
};
