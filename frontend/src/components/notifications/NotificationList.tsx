import React, { useEffect, useMemo, useState, useCallback, memo } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { 
  useNotifications, 
  useMarkNotificationAsRead, 
  useMarkAllNotificationsAsRead 
} from '../../lib/api/hooks';
import { useNavigate } from 'react-router-dom';
import { NotificationEvent } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '../ui/button';
import { EmptyState } from '../ui/empty-state';
import { Skeleton } from '../ui/skeleton';

const ICON_MAP: Record<NotificationEvent['type'] | 'DEFAULT', string> = {
  EVENT_CREATED: '🎉',
  USER_JOINED_EVENT: '👋',
  USER_LEFT_EVENT: '🚪',
  EVENT_CLOSED: '🔒',
  EVENT_DELIVERED: '🚚',
  PAYMENT_CONFIRMED: '💰',
  EVENT_COMPLETED: '✅',
  REMINDER_SENT: '⏰',
  EVENT_CLOSING_SOON: '⏰',
  ORDER_PLACED: '🍽️',
  ORDER_UPDATED: '📝',
  PAYMENT_REMINDER: '💳',
  DEFAULT: '📢',
};

const TITLE_MAP: Record<NotificationEvent['type'] | 'DEFAULT', string> = {
  EVENT_CREATED: 'New Event Created',
  USER_JOINED_EVENT: 'User Joined Event',
  USER_LEFT_EVENT: 'User Left Event',
  EVENT_CLOSED: 'Event Closed',
  EVENT_DELIVERED: 'Order Delivered',
  PAYMENT_CONFIRMED: 'Payment Confirmed',
  EVENT_COMPLETED: 'Event Completed',
  REMINDER_SENT: 'Reminder',
  EVENT_CLOSING_SOON: 'Event Closing Soon',
  ORDER_PLACED: 'Order Placed',
  ORDER_UPDATED: 'Order Updated',
  PAYMENT_REMINDER: 'Payment Reminder',
  DEFAULT: 'Notification',
};

const getNotificationIcon = (type: NotificationEvent['type'] | string) =>
  ICON_MAP[type as NotificationEvent['type']] ?? ICON_MAP.DEFAULT;

const getNotificationTitle = (type: NotificationEvent['type'] | string) =>
  TITLE_MAP[type as NotificationEvent['type']] ?? TITLE_MAP.DEFAULT;

interface NotificationRowProps {
  notification: NotificationEvent;
  isLast: boolean;
  isMarkAsReadPending: boolean;
  onMarkAsRead: (notificationId: string, event: React.MouseEvent) => void;
  onOpenNotification: (notification: NotificationEvent) => void;
}

const NotificationRow: React.FC<NotificationRowProps> = memo(
  ({ notification, isLast, isMarkAsReadPending, onMarkAsRead, onOpenNotification }) => {
    const relativeTime = useMemo(
      () => formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true }),
      [notification.createdAt]
    );

    const icon = useMemo(() => getNotificationIcon(notification.type), [notification.type]);
    const title = useMemo(
      () => getNotificationTitle(notification.type),
      [notification.type]
    );
    const description = useMemo(() => {
      if (notification.body) return notification.body;
      if (notification.title) return notification.title;
      if (notification.subject?.eventTitle) {
        return notification.subject.restaurantName
          ? `${notification.subject.eventTitle} • ${notification.subject.restaurantName}`
          : notification.subject.eventTitle;
      }
      if (notification.event?.title) {
        return notification.event.restaurant
          ? `${notification.event.title} • ${notification.event.restaurant.name}`
          : notification.event.title;
      }
      return undefined;
    }, [notification.body, notification.subject, notification.event]);

    const handleRowClick = useCallback(() => {
      onOpenNotification(notification);
    }, [notification, onOpenNotification]);

    const handleMarkAsReadClick = useCallback(
      (event: React.MouseEvent) => {
        onMarkAsRead(notification.id, event);
      },
      [notification.id, onMarkAsRead]
    );

    return (
      <div
        data-testid="notification-row"
        className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors ${
          !isLast ? 'border-b border-gray-100' : ''
        } ${!notification.read ? 'bg-blue-50' : ''}`}
      >
        <div className="flex items-start gap-4">
          <span className="text-3xl flex-shrink-0" aria-hidden="true">
            {icon}
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h2 className="text-base font-medium text-slate-900">{title}</h2>
              {!notification.read && (
                <span
                  className="flex-shrink-0 w-2.5 h-2.5 bg-blue-500 rounded-full mt-1.5"
                  aria-hidden="true"
                />
              )}
            </div>

            {description && (
              <p className="text-sm text-slate-600 mb-2">
                {description}
              </p>
            )}

            <p className="text-xs text-slate-400">{relativeTime}</p>
          </div>

          {!notification.read && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAsReadClick}
              disabled={isMarkAsReadPending}
              className="flex-shrink-0"
              aria-label="Mark as read"
            >
              <Check className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRowClick}
            className="flex-shrink-0"
            aria-label="Open notification details"
          >
            View
          </Button>
        </div>
      </div>
    );
  }
);

NotificationRow.displayName = 'NotificationRow';

/**
 * NotificationList Component
 * 
 * Full-page notification list with filtering and actions.
 * 
 * Features:
 * - Display all notifications (paginated)
 * - Filter by read/unread status
 * - Mark individual notifications as read
 * - Mark all notifications as read
 * - Click notification to navigate to related entity
 * - Loading states
 * - Empty state
 */

interface NotificationListProps {
  /** Optional filter for showing only unread notifications */
  unreadOnly?: boolean;
}

const NotificationList: React.FC<NotificationListProps> = ({ unreadOnly = false }) => {
  const [filter, setFilter] = useState<'all' | 'unread'>(unreadOnly ? 'unread' : 'all');
  const navigate = useNavigate();

  // Fetch notifications based on filter
  const { data: notifications = [], isLoading } = useNotifications({ 
    unreadOnly: filter === 'unread' 
  });
  
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();

  const handleNotificationClick = useCallback(
    (notification: NotificationEvent) => {
      if (!notification.read) {
        markAsReadMutation.mutate(notification.id);
      }

      const cta = notification.cta;

      if (cta?.kind === 'event' && cta.id) {
        navigate(`/events/${cta.id}`);
      } else if (cta?.kind === 'order' && cta.id) {
        navigate(`/orders/${cta.id}`);
      } else if (notification.eventId) {
        navigate(`/events/${notification.eventId}`);
      } else if (notification.orderId) {
        navigate(`/orders/${notification.orderId}`);
      }
    },
    [markAsReadMutation, navigate]
  );

  const handleMarkAsRead = useCallback(
    (notificationId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      markAsReadMutation.mutate(notificationId);
    },
    [markAsReadMutation]
  );

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );
  const VIRTUAL_THRESHOLD = 60;
  const ITEM_HEIGHT = 112;
  const VISIBLE_WINDOW = 12;
  const BUFFER = 3;

  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    setScrollOffset(0);
  }, [filter]);

  const enableVirtualization = notifications.length > VIRTUAL_THRESHOLD;

  const { startIndex, endIndex, paddingTop, paddingBottom } = useMemo(() => {
    if (!enableVirtualization) {
      return {
        startIndex: 0,
        endIndex: notifications.length,
        paddingTop: 0,
        paddingBottom: 0,
      };
    }

    const rawIndex = Math.floor(scrollOffset / ITEM_HEIGHT);
    const start = Math.max(0, rawIndex - BUFFER);
    const end = Math.min(
      notifications.length,
      start + VISIBLE_WINDOW + BUFFER * 2
    );

    return {
      startIndex: start,
      endIndex: end,
      paddingTop: start * ITEM_HEIGHT,
      paddingBottom: Math.max(0, (notifications.length - end) * ITEM_HEIGHT),
    };
  }, [enableVirtualization, notifications.length, scrollOffset]);

  const displayedNotifications = useMemo(
    () => notifications.slice(startIndex, endIndex),
    [notifications, startIndex, endIndex]
  );

  const handleVirtualScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      setScrollOffset(event.currentTarget.scrollTop);
    },
    []
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-slate-500 mt-1">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {notifications.length > 0 && unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending}
            className="flex items-center gap-2"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-200">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-none border-b-2 ${
            filter === 'all'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          All
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-none border-b-2 ${
            filter === 'unread'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Unread {unreadCount > 0 && `(${unreadCount})`}
        </Button>
      </div>

      {/* Notification List */}
      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          description={
            filter === 'unread'
              ? "You're all caught up! All notifications have been read."
              : "You'll see updates about events and orders here."
          }
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div
            data-testid="notification-scroll-region"
            data-virtualized={enableVirtualization ? 'true' : 'false'}
            className={enableVirtualization ? 'max-h-[896px] overflow-auto' : ''}
            onScroll={enableVirtualization ? handleVirtualScroll : undefined}
          >
            <div
              style={{
                paddingTop: enableVirtualization ? paddingTop : undefined,
                paddingBottom: enableVirtualization ? paddingBottom : undefined,
              }}
            >
              {displayedNotifications.map((notification, index) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  isLast={startIndex + index === notifications.length - 1}
                  isMarkAsReadPending={markAsReadMutation.isPending}
                  onMarkAsRead={handleMarkAsRead}
                  onOpenNotification={handleNotificationClick}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Load More (Future Enhancement) */}
      {/* TODO: Implement pagination or infinite scroll */}
    </div>
  );
};

export default NotificationList;
