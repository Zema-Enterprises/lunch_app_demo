import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { renderWithProviders } from '../utils/test-utils';
import { DEFAULT_THEME } from '@/theme/constants';
import { createMockTheme } from '../utils/factories';
import { useCompanyTheme } from '@/lib/api/hooks';

vi.mock('@/lib/api/hooks', () => ({
  useCompanyTheme: vi.fn(),
}));

describe('ThemeProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    (useCompanyTheme as unknown as vi.Mock).mockReset?.();
    (useCompanyTheme as unknown as vi.Mock).mockImplementation(() => ({
      data: undefined,
      isLoading: false,
    }));
  });

  it('applies theme variables from API', async () => {
    const theme = createMockTheme({
      primaryColor: '#112233',
      secondaryColor: '#445566',
      backgroundColor: '#faf0e6',
      coverPhotoUrl: 'https://example.com/cover.jpg',
    });

    (useCompanyTheme as unknown as vi.Mock).mockReturnValue({
      data: theme,
      isLoading: false,
    });

    renderWithProviders(
      <ThemeProvider>
        <div>child</div>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue('--ls-primary')).toBe('#112233');
      expect(document.documentElement.style.getPropertyValue('--ls-secondary')).toBe('#445566');
      expect(document.documentElement.style.getPropertyValue('--ls-background')).toBe('#faf0e6');
      expect(document.documentElement.style.getPropertyValue('--ls-cover-url')).toContain('cover.jpg');
    });
  });

  it('falls back to defaults when theme is unavailable', async () => {
    (useCompanyTheme as unknown as vi.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    renderWithProviders(
      <ThemeProvider>
        <div>child</div>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue('--ls-primary')).toBe(DEFAULT_THEME.primaryColor);
      expect(document.documentElement.style.getPropertyValue('--ls-secondary')).toBe(DEFAULT_THEME.secondaryColor);
      expect(document.documentElement.style.getPropertyValue('--ls-background')).toBe(DEFAULT_THEME.backgroundColor);
    });
  });
});
