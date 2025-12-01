import { describe, it, expect } from 'vitest';
import { waitFor } from '@testing-library/react';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { renderWithProviders } from '../utils/test-utils';
import { DEFAULT_THEME } from '@/theme/constants';
import { createMockTheme } from '../utils/factories';
import { useCompanyTheme } from '@/lib/api/hooks';

vi.mock('@/lib/api/hooks', () => ({
  useCompanyTheme: vi.fn(),
}));

describe('ThemeProvider with slug routes', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('style');
    localStorage.clear();
    (useCompanyTheme as any).mockReset?.();
  });

  it('fetches and applies theme under /c/:slug paths', async () => {
    const theme = createMockTheme({
      primaryColor: '#123456',
      secondaryColor: '#654321',
      backgroundColor: '#ffffff',
      coverPhotoUrl: '/uploads/themes/mock-company/cover.webp',
    });

    (useCompanyTheme as any).mockReturnValue({
      data: theme,
      isLoading: false,
    });

    renderWithProviders(
      <ThemeProvider>
        <div>child</div>
      </ThemeProvider>,
      { route: '/c/mock-company/dashboard' }
    );

    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue('--ls-primary')).toBe('#123456');
      expect(document.documentElement.style.getPropertyValue('--ls-cover-url')).toContain('mock-company/cover.webp');
    });
  });

  it('falls back to defaults when slug present but theme unavailable', async () => {
    (useCompanyTheme as any).mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    renderWithProviders(
      <ThemeProvider>
        <div>child</div>
      </ThemeProvider>,
      { route: '/c/mock-company/dashboard' }
    );

    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue('--ls-primary')).toBe(DEFAULT_THEME.primaryColor);
      expect(document.documentElement.style.getPropertyValue('--ls-secondary')).toBe(DEFAULT_THEME.secondaryColor);
    });
  });
});
