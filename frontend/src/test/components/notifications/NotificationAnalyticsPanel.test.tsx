import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { render, screen, waitFor } from '@/test/utils/test-utils';
import userEvent from '@testing-library/user-event';
import NotificationAnalyticsPanel from '@/components/notifications/NotificationAnalyticsPanel';
import { server } from '@/test/mocks/server';

const API_BASE_URL = 'http://localhost:5000/api';

describe('NotificationAnalyticsPanel', () => {
  it('renders delivery metrics', async () => {
    server.use(
      http.get(`${API_BASE_URL}/notifications/analytics/summary`, () => {
        return HttpResponse.json({
          data: {
            companyId: 'company_123',
            totals: { notifications: 12, unread: 3 },
            delivery: {
              REALTIME: { SUCCESS: 9 },
              PUSH: { SUCCESS: 2, FAILED: 1 },
            },
          },
        });
      })
    );

    render(<NotificationAnalyticsPanel />);

    await waitFor(() => {
      expect(screen.getByText(/Notification Analytics/i)).toBeInTheDocument();
      expect(screen.getByText(/Unread/i).nextSibling).toHaveTextContent('3');
      expect(screen.getByText(/Push Delivery/i)).toBeInTheDocument();
      expect(screen.getByText(/2 success/i)).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const pushFilter = screen.getByRole('button', { name: /^Push$/i });
    await user.click(pushFilter);
    await waitFor(() => {
      expect(pushFilter.className).toContain('bg-slate-900');
    });
    expect(screen.queryByTestId('channel-card-realtime')).not.toBeInTheDocument();
  });

  it('shows error state when summary fails', async () => {
    server.use(
      http.get(`${API_BASE_URL}/notifications/analytics/summary`, () => HttpResponse.error())
    );

    render(<NotificationAnalyticsPanel />);

    expect(await screen.findByText(/Failed to load delivery metrics/i)).toBeInTheDocument();
  });
});
