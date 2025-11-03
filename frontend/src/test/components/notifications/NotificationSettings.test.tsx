import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import NotificationSettings from '@/components/notifications/NotificationSettings';
import { render } from '../../utils/test-utils';
import { createMockNotificationSettings } from '../../utils/factories';
import type { UserNotificationSettings } from '@/types';
import { server } from '../../mocks/server';
import { registerForPushNotifications, unsubscribeFromPushNotifications, isPushFeatureEnabled } from '@/lib/push/push-manager';

vi.mock('@/lib/push/push-manager', () => ({
  registerForPushNotifications: vi.fn(),
  unsubscribeFromPushNotifications: vi.fn(),
  isPushFeatureEnabled: vi.fn(() => true),
}));

const API_BASE_URL = 'http://localhost:5000/api';
const SETTINGS_ENDPOINT = `${API_BASE_URL}/notifications/settings`;

const setupSettingsResponse = (settings = createMockNotificationSettings()) => {
  server.use(
    http.get(SETTINGS_ENDPOINT, () => {
      return HttpResponse.json({ data: settings });
    })
  );
  return settings;
};

const mockRegisterForPush = registerForPushNotifications as unknown as ReturnType<typeof vi.fn>;
const mockUnsubscribePush = unsubscribeFromPushNotifications as unknown as ReturnType<typeof vi.fn>;
const mockIsPushFeatureEnabled = isPushFeatureEnabled as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockRegisterForPush.mockReset();
  mockUnsubscribePush.mockReset();
  mockIsPushFeatureEnabled.mockReturnValue(true);
});

describe('NotificationSettings Component', () => {
  it('should render settings header and channel toggles', async () => {
    setupSettingsResponse();

    render(<NotificationSettings />);

    expect(
      await screen.findByRole('heading', { name: /notification settings/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: /email notifications/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: /in-app notifications/i })
    ).toBeInTheDocument();
  });

  it('should display all notification types', async () => {
    setupSettingsResponse();

    render(<NotificationSettings />);

    await waitFor(() => {
      expect(screen.getByText('Notification Types')).toBeInTheDocument();
    });

    const expectedTypes = [
      'Event Created',
      'User Joined Event',
      'Event Closed',
      'Order Delivered',
      'Payment Confirmed',
      'Event Completed',
      'Order Placed',
      'Order Updated',
      'Payment Reminder',
    ];

    expectedTypes.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(
        screen.getByRole('checkbox', { name: new RegExp(label, 'i') })
      ).toBeInTheDocument();
    });
  });

  it('should toggle email notifications and show unsaved changes banner', async () => {
    setupSettingsResponse(
      createMockNotificationSettings({ emailNotifications: true })
    );
    const user = userEvent.setup();

    render(<NotificationSettings />);

    const emailToggle = await screen.findByRole('checkbox', {
      name: /email notifications/i,
    });

    expect(emailToggle).toBeChecked();
    await user.click(emailToggle);

    await waitFor(() => {
      expect(emailToggle).not.toBeChecked();
      expect(
        screen.getByText(/you have unsaved changes/i)
      ).toBeInTheDocument();
    });
  });

  it('should toggle in-app notifications', async () => {
    setupSettingsResponse(
      createMockNotificationSettings({ inAppNotifications: false })
    );
    const user = userEvent.setup();

    render(<NotificationSettings />);

    const inAppToggle = await screen.findByRole('checkbox', {
      name: /in-app notifications/i,
    });

    expect(inAppToggle).not.toBeChecked();
    await user.click(inAppToggle);

    await waitFor(() => {
      expect(inAppToggle).toBeChecked();
      expect(
        screen.getByText(/you have unsaved changes/i)
      ).toBeInTheDocument();
    });
  });

  it('should toggle individual notification type', async () => {
    setupSettingsResponse(
      createMockNotificationSettings({ notifyOnEventCreated: false })
    );
    const user = userEvent.setup();

    render(<NotificationSettings />);

    const eventCreatedToggle = await screen.findByRole('checkbox', {
      name: /event created/i,
    });

    expect(eventCreatedToggle).not.toBeChecked();
    await user.click(eventCreatedToggle);

    await waitFor(() => {
      expect(eventCreatedToggle).toBeChecked();
    });
  });

  it('should toggle multiple notification types independently', async () => {
    setupSettingsResponse(
      createMockNotificationSettings({
        notifyOnEventCreated: false,
        notifyOnPaymentConfirmed: false,
        notifyOnOrderUpdated: true,
      })
    );
    const user = userEvent.setup();

    render(<NotificationSettings />);

    const eventCreatedToggle = await screen.findByRole('checkbox', {
      name: /event created/i,
    });
    const paymentConfirmedToggle = screen.getByRole('checkbox', {
      name: /payment confirmed/i,
    });
    const orderUpdatedToggle = screen.getByRole('checkbox', {
      name: /order updated/i,
    });

    expect(eventCreatedToggle).not.toBeChecked();
    expect(paymentConfirmedToggle).not.toBeChecked();
    expect(orderUpdatedToggle).toBeChecked();

    await user.click(eventCreatedToggle);
    await user.click(paymentConfirmedToggle);
    await user.click(orderUpdatedToggle);

    expect(eventCreatedToggle).toBeChecked();
    expect(paymentConfirmedToggle).toBeChecked();
    expect(orderUpdatedToggle).not.toBeChecked();
  });

  it('should enable push notifications via push manager', async () => {
    setupSettingsResponse();
    mockRegisterForPush.mockResolvedValueOnce({ endpoint: 'https://push.example.com' } as any);
    const user = userEvent.setup();

    render(<NotificationSettings />);

    const enableButton = await screen.findByRole('button', { name: /enable push notifications/i });
    await user.click(enableButton);

    await waitFor(() => {
      expect(mockRegisterForPush).toHaveBeenCalled();
      expect(screen.getByText(/push notifications enabled/i)).toBeInTheDocument();
      expect(screen.getByText(/are active on this device/i)).toBeInTheDocument();
    });
  });

  it('shows message when push permission is denied', async () => {
    setupSettingsResponse();
    mockRegisterForPush.mockResolvedValueOnce(null);
    const user = userEvent.setup();

    render(<NotificationSettings />);

    const enableButton = await screen.findByRole('button', { name: /enable push notifications/i });
    await user.click(enableButton);

    await waitFor(() => {
      expect(mockRegisterForPush).toHaveBeenCalled();
      expect(screen.getByText(/permission was not granted/i)).toBeInTheDocument();
    });
  });

  it('disables push button when feature flag is off', async () => {
    mockIsPushFeatureEnabled.mockReturnValue(false);
    setupSettingsResponse();
    const user = userEvent.setup();

    render(<NotificationSettings />);

    const button = await screen.findByRole('button', { name: /push/i });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(mockRegisterForPush).not.toHaveBeenCalled();

    mockIsPushFeatureEnabled.mockReturnValue(true);
  });

  it('should save changes and clear unsaved banner', async () => {
    const initialSettings = createMockNotificationSettings({
      emailNotifications: true,
    });
    let receivedBody: Partial<UserNotificationSettings> | null = null;

    server.use(
      http.get(SETTINGS_ENDPOINT, () => {
        return HttpResponse.json({ data: initialSettings });
      }),
      http.put(SETTINGS_ENDPOINT, async ({ request }) => {
        const body = (await request.json()) as Partial<UserNotificationSettings>;
        receivedBody = body;
        return HttpResponse.json({
          data: { ...initialSettings, emailNotifications: false },
        });
      })
    );

    const user = userEvent.setup();
    render(<NotificationSettings />);

    const emailToggle = await screen.findByRole('checkbox', {
      name: /email notifications/i,
    });
    await user.click(emailToggle);

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(receivedBody).not.toBeNull();
      expect(receivedBody?.emailNotifications).toBe(false);
      expect(
        screen.queryByText(/you have unsaved changes/i)
      ).not.toBeInTheDocument();
    });
  });

  it('should disable save button while saving', async () => {
    const initialSettings = createMockNotificationSettings({
      emailNotifications: true,
    });

    server.use(
      http.get(SETTINGS_ENDPOINT, () => {
        return HttpResponse.json({ data: initialSettings });
      }),
      http.put(SETTINGS_ENDPOINT, async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json({ data: { ...initialSettings } });
      })
    );

    const user = userEvent.setup();
    render(<NotificationSettings />);

    const emailToggle = await screen.findByRole('checkbox', {
      name: /email notifications/i,
    });
    await user.click(emailToggle);

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    expect(saveButton).toBeDisabled();

    await waitFor(() => {
      expect(
        screen.queryByText(/you have unsaved changes/i)
      ).not.toBeInTheDocument();
    });
  });

  it('should reset changes to original values', async () => {
    setupSettingsResponse(
      createMockNotificationSettings({
        emailNotifications: true,
        notifyOnEventCreated: false,
      })
    );
    const user = userEvent.setup();

    render(<NotificationSettings />);

    const emailToggle = await screen.findByRole('checkbox', {
      name: /email notifications/i,
    });
    const eventCreatedToggle = screen.getByRole('checkbox', {
      name: /event created/i,
    });

    expect(emailToggle).toBeChecked();
    expect(eventCreatedToggle).not.toBeChecked();

    await user.click(emailToggle);
    await user.click(eventCreatedToggle);

    await waitFor(() => {
      expect(screen.getByText(/you have unsaved changes/i)).toBeInTheDocument();
    });

    const resetButton = screen.getByRole('button', { name: /reset/i });
    await user.click(resetButton);

    await waitFor(() => {
      expect(emailToggle).toBeChecked();
      expect(eventCreatedToggle).not.toBeChecked();
      expect(
        screen.queryByText(/you have unsaved changes/i)
      ).not.toBeInTheDocument();
    });
  });

  it('should show error message when settings fail to load', async () => {
    server.use(
      http.get(SETTINGS_ENDPOINT, () => {
        return HttpResponse.json(
          { error: 'Failed to load settings' },
          { status: 500 }
        );
      })
    );

    render(<NotificationSettings />);

    await waitFor(() => {
      expect(
        screen.getByText(/failed to load notification settings/i)
      ).toBeInTheDocument();
    });
  });
});
