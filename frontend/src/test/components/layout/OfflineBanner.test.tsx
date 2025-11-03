import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import OfflineBanner from '@/components/layout/OfflineBanner';

describe('OfflineBanner', () => {
  it('renders nothing when online', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    render(<OfflineBanner />);
    expect(screen.queryByText(/you are offline/i)).not.toBeInTheDocument();
  });

  it('shows banner when offline', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    render(<OfflineBanner />);
    expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
  });
});
