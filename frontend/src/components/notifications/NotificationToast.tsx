import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NotificationEvent } from '../../types';
import { formatDistanceToNow } from 'date-fns';

/**
 * NotificationToast Component
 * 
 * Displays real-time notification alerts as toasts.
 * 
 * Features:
 * - Auto-dismiss after 5 seconds
 * - Click to navigate to related entity
 * - Manual dismiss button
 * - Different styles per notification type
 * - Accessible ARIA attributes
 */

interface NotificationToastProps {
  notification: NotificationEvent;
  onDismiss: () => void;
  onNavigate?: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ 
  notification, 
  onDismiss,
  onNavigate 
}) => {
  const navigate = useNavigate();
  const timerRef = useRef<number>();

  useEffect(() => {
    // Auto-dismiss after 5 seconds
    timerRef.current = window.setTimeout(() => {
      onDismiss();
    }, 5000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [onDismiss]);

  const handleClick = () => {
    // Navigate to the related entity
    if (notification.eventId) {
      navigate(`/events/${notification.eventId}`);
    } else if (notification.orderId) {
      navigate(`/orders/${notification.orderId}`);
    }
    
    // Call optional onNavigate callback
    if (onNavigate) {
      onNavigate();
    }
    
    // Dismiss the toast
    onDismiss();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'EVENT_CREATED':
        return '🎉';
      case 'USER_JOINED_EVENT':
        return '👋';
      case 'USER_LEFT_EVENT':
        return '🚪';
      case 'EVENT_CLOSED':
        return '🔒';
      case 'EVENT_DELIVERED':
        return '🚚';
      case 'PAYMENT_CONFIRMED':
        return '💰';
      case 'EVENT_COMPLETED':
        return '✅';
      case 'REMINDER_SENT':
      case 'EVENT_CLOSING_SOON':
        return '⏰';
      case 'ORDER_PLACED':
        return '🍽️';
      case 'ORDER_UPDATED':
        return '📝';
      case 'PAYMENT_REMINDER':
        return '💳';
      default:
        return '📢';
    }
  };

  const getNotificationTitle = (type: string) => {
    switch (type) {
      case 'EVENT_CREATED':
        return 'New Event';
      case 'USER_JOINED_EVENT':
        return 'User Joined';
      case 'USER_LEFT_EVENT':
        return 'User Left';
      case 'EVENT_CLOSED':
        return 'Event Closed';
      case 'EVENT_DELIVERED':
        return 'Order Delivered';
      case 'PAYMENT_CONFIRMED':
        return 'Payment Confirmed';
      case 'EVENT_COMPLETED':
        return 'Event Completed';
      case 'REMINDER_SENT':
      case 'EVENT_CLOSING_SOON':
        return 'Reminder';
      case 'ORDER_PLACED':
        return 'Order Placed';
      case 'ORDER_UPDATED':
        return 'Order Updated';
      case 'PAYMENT_REMINDER':
        return 'Payment Due';
      default:
        return 'Notification';
    }
  };

  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'EVENT_CREATED':
      case 'USER_JOINED_EVENT':
        return 'bg-blue-50 border-blue-200';
      case 'EVENT_CLOSED':
      case 'REMINDER_SENT':
      case 'PAYMENT_REMINDER':
        return 'bg-yellow-50 border-yellow-200';
      case 'EVENT_DELIVERED':
      case 'PAYMENT_CONFIRMED':
      case 'EVENT_COMPLETED':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  const title = notification.title || getNotificationTitle(notification.type);
  const description =
    notification.body ||
    notification.subject?.eventTitle ||
    notification.event?.title;

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg shadow-lg border-2 ${getNotificationStyle(notification.type)} cursor-pointer hover:shadow-xl transition-shadow`}
      onClick={handleClick}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Icon */}
      <span className="text-2xl flex-shrink-0" aria-hidden="true">
        {getNotificationIcon(notification.type)}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 mb-0.5">
          {title}
        </p>
        
        {description && (
          <p className="text-sm text-slate-700">
            {description}
          </p>
        )}
        
        <p className="text-xs text-slate-500 mt-1">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>

      {/* Dismiss Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

/**
 * NotificationToastContainer Component
 * 
 * Container for displaying multiple notification toasts.
 * Stacks toasts vertically with animations.
 */

interface NotificationToastContainerProps {
  notifications: NotificationEvent[];
  onDismiss: (notificationId: string) => void;
  onNavigate?: (notificationId: string) => void;
}

export const NotificationToastContainer: React.FC<NotificationToastContainerProps> = ({
  notifications,
  onDismiss,
  onNavigate,
}) => {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 space-y-3 max-w-md"
      role="region"
      aria-label="Notification toasts"
      aria-live="polite"
    >
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onDismiss={() => onDismiss(notification.id)}
          onNavigate={() => onNavigate?.(notification.id)}
        />
      ))}
    </div>
  );
};

export default NotificationToast;
