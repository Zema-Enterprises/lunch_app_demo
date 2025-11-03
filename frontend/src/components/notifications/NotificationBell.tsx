import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNotificationStats, useNotifications, useMarkNotificationAsRead } from '../../lib/api/hooks';
import { useNavigate } from 'react-router-dom';
import { NotificationEvent } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '../ui/button';
import { useNotificationQueueStore } from '@/store/notificationQueueStore';

/**
 * NotificationBell Component
 * 
 * Displays a bell icon with an unread count badge and a dropdown menu
 * showing recent notifications.
 * 
 * Features:
 * - Badge with unread notification count
 * - Dropdown menu with recent notifications (limit 5)
 * - Click to open/close dropdown
 * - Click notification to navigate and mark as read
 * - View all notifications link
 * - Empty state when no notifications
 */
const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fetch unread count and recent notifications
  const { data: stats } = useNotificationStats();
  const { data: notifications = [] } = useNotifications({ limit: 5 });
  const markAsReadMutation = useMarkNotificationAsRead();
  const pendingBadgeCount = useNotificationQueueStore((state) => state.pendingBadgeCount);

  const unreadCount = stats?.unread || 0;
  const totalUnreadCount = unreadCount + pendingBadgeCount;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleNotificationClick = (notification: NotificationEvent) => {
    // Mark as read
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate to the related entity
    if (notification.eventId) {
      navigate(`/events/${notification.eventId}`);
    }

    // Close dropdown
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'EVENT_CREATED':
        return '🎉';
      case 'USER_JOINED_EVENT':
        return '👋';
      case 'EVENT_CLOSED':
        return '🔒';
      case 'EVENT_DELIVERED':
        return '🚚';
      case 'PAYMENT_CONFIRMED':
        return '💰';
      case 'EVENT_COMPLETED':
        return '✅';
      case 'REMINDER_SENT':
        return '⏰';
      default:
        return '📢';
    }
  };

  const getNotificationTitle = (type: string) => {
    switch (type) {
      case 'EVENT_CREATED':
        return 'New Event Created';
      case 'USER_JOINED_EVENT':
        return 'User Joined Event';
      case 'EVENT_CLOSED':
        return 'Event Closed';
      case 'EVENT_DELIVERED':
        return 'Order Delivered';
      case 'PAYMENT_CONFIRMED':
        return 'Payment Confirmed';
      case 'EVENT_COMPLETED':
        return 'Event Completed';
      case 'REMINDER_SENT':
        return 'Reminder';
      default:
        return 'Notification';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
        aria-label={`Notifications${totalUnreadCount > 0 ? ` (${totalUnreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        
        {/* Badge with unread count */}
        {totalUnreadCount > 0 && (
          <span 
            className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full"
            aria-live="polite"
            aria-atomic="true"
          >
            {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
          role="menu"
          aria-label="Notifications menu"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
            {totalUnreadCount > 0 && (
              <span className="text-xs text-slate-500">
                {totalUnreadCount} unread
              </span>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              // Empty State
              <div className="px-4 py-8 text-center">
                <Bell className="w-12 h-12 mx-auto text-slate-300 mb-2" aria-hidden="true" />
                <p className="text-sm text-slate-500">No notifications yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  You'll see updates about events here
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <span className="text-2xl flex-shrink-0" aria-hidden="true">
                      {getNotificationIcon(notification.type)}
                    </span>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900 leading-tight">
                          {getNotificationTitle(notification.type)}
                        </p>
                        {!notification.read && (
                          <span 
                            className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1"
                            aria-label="Unread"
                          />
                        )}
                      </div>
                      
                      <p className="text-xs text-slate-400 mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigate('/notifications');
                  setIsOpen(false);
                }}
                className="w-full justify-center text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                View all notifications
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
