import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationToast, {
  NotificationToastContainer,
} from '@/components/notifications/NotificationToast';
import { render } from '../../utils/test-utils';
import {
  createMockNotification,
  createMockNotifications,
  createMockEvent,
} from '../../utils/factories';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom'
  );

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('NotificationToast Component', () => {
beforeEach(() => {
  mockNavigate.mockReset();
  vi.useRealTimers();
});

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render notification details with accessible attributes', () => {
    vi.setSystemTime(new Date('2025-10-07T12:00:00Z'));
    const notification = createMockNotification({
      type: 'EVENT_CREATED',
      eventId: 'event-123',
      event: createMockEvent({ title: 'Team Lunch' }),
      createdAt: new Date('2025-10-07T11:55:00Z').toISOString(),
    });

    const onDismiss = vi.fn();

    render(<NotificationToast notification={notification} onDismiss={onDismiss} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'polite');
    expect(alert).toHaveAttribute('aria-atomic', 'true');
    expect(screen.getByText(/new event/i, { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText(/team lunch/i)).toBeInTheDocument();
    expect(screen.getByText(/5 minutes ago/i)).toBeInTheDocument();

    const dismissButton = screen.getByRole('button', {
      name: /dismiss notification/i,
    });
    expect(dismissButton).toBeInTheDocument();
  });

  it('should auto-dismiss after 5 seconds', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const notification = createMockNotification();

    render(<NotificationToast notification={notification} onDismiss={onDismiss} />);

    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5000);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should dismiss and navigate when toast body is clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    const onNavigate = vi.fn();
    const notification = createMockNotification({
      type: 'EVENT_CREATED',
      eventId: 'event-42',
    });

    render(
      <NotificationToast
        notification={notification}
        onDismiss={onDismiss}
        onNavigate={onNavigate}
      />
    );

    await user.click(screen.getByRole('alert'));

    expect(mockNavigate).toHaveBeenCalledWith('/events/event-42');
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should only dismiss when close button is clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    const onNavigate = vi.fn();
    const notification = createMockNotification({
      eventId: 'event-100',
    });

    render(
      <NotificationToast
        notification={notification}
        onDismiss={onDismiss}
        onNavigate={onNavigate}
      />
    );

    const dismissButton = screen.getByRole('button', {
      name: /dismiss notification/i,
    });
    await user.click(dismissButton);

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onNavigate).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should render fallback when notification type is unknown', () => {
    vi.setSystemTime(new Date('2025-10-07T12:00:00Z'));
    const notification = createMockNotification({
      type: 'CUSTOM_TYPE' as any,
      createdAt: new Date('2025-10-07T11:59:00Z').toISOString(),
    });

    render(<NotificationToast notification={notification} onDismiss={vi.fn()} />);

    expect(screen.getByText(/notification/i)).toBeInTheDocument();
    expect(screen.getByText(/1 minute ago/i)).toBeInTheDocument();
  });
});

describe('NotificationToastContainer', () => {
  it('should render stacked notifications with region attributes', () => {
    const notifications = createMockNotifications(2).map((notification, index) => ({
      ...notification,
      id: `toast-${index + 1}`,
      eventId: `event-${index + 1}`,
    }));
    const onDismiss = vi.fn();
    const onNavigate = vi.fn();

    render(
      <NotificationToastContainer
        notifications={notifications}
        onDismiss={onDismiss}
        onNavigate={onNavigate}
      />
    );

    const container = screen.getByRole('region', {
      name: /notification toasts/i,
    });
    expect(container).toBeInTheDocument();
    expect(screen.getAllByRole('alert')).toHaveLength(2);
  });

  it('should render nothing when there are no notifications', () => {
    const { container } = render(
      <NotificationToastContainer notifications={[]} onDismiss={vi.fn()} />
    );

    expect(container.firstChild).toBeNull();
  });
});
