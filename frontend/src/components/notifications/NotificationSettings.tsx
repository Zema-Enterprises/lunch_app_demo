import React, { useState, useEffect } from 'react';
import { Bell, Mail, Smartphone } from 'lucide-react';
import { useNotificationSettings, useUpdateNotificationSettings } from '../../lib/api/hooks';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { Card } from '../ui/card';
import { registerForPushNotifications, unsubscribeFromPushNotifications, isPushFeatureEnabled } from '@/lib/push/push-manager';

/**
 * NotificationSettings Component
 * 
 * Allows users to configure their notification preferences.
 * 
 * Features:
 * - Toggle email notifications
 * - Toggle in-app notifications
 * - Configure preferences for each notification type
 * - Save settings with validation
 * - Loading states
 * - Success/error feedback
 */

interface NotificationSetting {
  key: keyof Omit<UserNotificationSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'emailNotifications' | 'inAppNotifications'>;
  label: string;
  description: string;
  icon: string;
}

import { UserNotificationSettings } from '../../types';

const NOTIFICATION_SETTINGS: NotificationSetting[] = [
  {
    key: 'notifyOnEventCreated',
    label: 'Event Created',
    description: 'Get notified when a new lunch event is created',
    icon: '🎉',
  },
  {
    key: 'notifyOnUserJoinedEvent',
    label: 'User Joined Event',
    description: 'Get notified when someone joins your event',
    icon: '👋',
  },
  {
    key: 'notifyOnEventClosed',
    label: 'Event Closed',
    description: 'Get notified when ordering closes for an event',
    icon: '🔒',
  },
  {
    key: 'notifyOnEventDelivered',
    label: 'Order Delivered',
    description: 'Get notified when your order has been delivered',
    icon: '🚚',
  },
  {
    key: 'notifyOnPaymentConfirmed',
    label: 'Payment Confirmed',
    description: 'Get notified when a payment is confirmed',
    icon: '💰',
  },
  {
    key: 'notifyOnEventCompleted',
    label: 'Event Completed',
    description: 'Get notified when an event is completed',
    icon: '✅',
  },
  {
    key: 'notifyOnOrderPlaced',
    label: 'Order Placed',
    description: 'Get notified when you place an order',
    icon: '🍽️',
  },
  {
    key: 'notifyOnOrderUpdated',
    label: 'Order Updated',
    description: 'Get notified when your order is updated',
    icon: '📝',
  },
  {
    key: 'notifyOnPaymentReminder',
    label: 'Payment Reminder',
    description: 'Get notified about pending payments',
    icon: '💳',
  },
];

const NotificationSettings: React.FC = () => {
  const { data: settings, isLoading } = useNotificationSettings();
  const updateSettings = useUpdateNotificationSettings();
  
  const [localSettings, setLocalSettings] = useState<Partial<UserNotificationSettings>>({});
  const [pendingKeys, setPendingKeys] = useState<Set<keyof UserNotificationSettings>>(new Set());
  const [pushStatus, setPushStatus] = useState<'idle' | 'enabled'>('idle');
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const [isProcessingPush, setIsProcessingPush] = useState(false);
  const pushFeatureEnabled = isPushFeatureEnabled();

  // Initialize local settings when data is loaded
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleToggle = async (key: keyof UserNotificationSettings) => {
    const nextValue = !localSettings[key];
    const previous = localSettings[key];
    setLocalSettings((prev) => ({
      ...prev,
      [key]: nextValue,
    }));
    setPendingKeys((prev) => new Set(prev).add(key));

    try {
      await updateSettings.mutateAsync({ [key]: nextValue } as Partial<UserNotificationSettings>);
    } catch (error) {
      setLocalSettings((prev) => ({
        ...prev,
        [key]: previous,
      }));
    } finally {
      setPendingKeys((prev) => {
        const copy = new Set(prev);
        copy.delete(key);
        return copy;
      });
    }
  };

  const handleEnablePush = async () => {
    if (!pushFeatureEnabled) {
      setPushMessage('Push notifications are currently unavailable.');
      return;
    }
    if (!pushFeatureEnabled) {
      setPushMessage('Push notifications are currently unavailable.');
      return;
    }
    setIsProcessingPush(true);
    setPushMessage(null);
    try {
      const subscription = await registerForPushNotifications();
      if (subscription) {
        setPushStatus('enabled');
        setPushMessage('Push notifications enabled.');
      } else {
        setPushMessage('Push notifications permission was not granted.');
      }
    } catch (error) {
      setPushMessage('Failed to enable push notifications. Please try again.');
    } finally {
      setIsProcessingPush(false);
    }
  };

  const handleDisablePush = async () => {
    setIsProcessingPush(true);
    setPushMessage(null);
    try {
      const result = await unsubscribeFromPushNotifications();
      if (result) {
        setPushStatus('idle');
        setPushMessage('Push notifications disabled.');
      }
    } catch (error) {
      setPushMessage('Failed to disable push notifications. Please try again.');
    } finally {
      setIsProcessingPush(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!settings || !localSettings) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load notification settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Notification Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage how you receive notifications about events and orders
        </p>
      </div>

      <div className="space-y-6">
        {/* Global Settings */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Notification Channels</h2>
          <div className="space-y-4">
            {/* Email Notifications */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Email Notifications</p>
                  <p className="text-sm text-slate-500">Receive notifications via email</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  aria-label="Toggle email notifications"
                  checked={localSettings.emailNotifications || false}
                  onChange={() => handleToggle('emailNotifications')}
                  disabled={pendingKeys.has('emailNotifications')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* In-App Notifications */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
                  <Smartphone className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">In-App Notifications</p>
                  <p className="text-sm text-slate-500">Receive notifications in the app</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  aria-label="Toggle in-app notifications"
                  checked={localSettings.inAppNotifications || false}
                  onChange={() => handleToggle('inAppNotifications')}
                  disabled={pendingKeys.has('inAppNotifications')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Push Notifications */}
            <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full">
                  <Bell className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Push Notifications</p>
                  <p className="text-sm text-slate-500">
                    Receive real-time alerts even when LunchSync is closed
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Button
                  variant={pushStatus === 'enabled' ? 'destructive' : 'secondary'}
                  size="sm"
                  onClick={pushStatus === 'enabled' ? handleDisablePush : handleEnablePush}
                  disabled={isProcessingPush || !pushFeatureEnabled}
                >
                  {pushFeatureEnabled
                    ? pushStatus === 'enabled'
                      ? 'Disable Push Notifications'
                      : 'Enable Push Notifications'
                    : 'Push Not Available'}
                </Button>
                {pushFeatureEnabled && pushStatus === 'enabled' && (
                  <p className="text-xs text-slate-500 text-right max-w-xs">
                    Push notifications are active on this device.
                  </p>
                )}
                {pushMessage && (
                  <p className="text-xs text-slate-500 text-right max-w-xs">{pushMessage}</p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Notification Type Settings */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Notification Types</h2>
          <p className="text-sm text-slate-500 mb-4">
            Choose which types of notifications you want to receive
          </p>
          <div className="space-y-3">
            {NOTIFICATION_SETTINGS.map((setting) => (
              <div
                key={setting.key}
                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl" aria-hidden="true">{setting.icon}</span>
                  <div>
                    <p className="font-medium text-slate-900">{setting.label}</p>
                    <p className="text-sm text-slate-500">{setting.description}</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    aria-label={`Toggle ${setting.label} notifications`}
                    checked={localSettings[setting.key] || false}
                    onChange={() => handleToggle(setting.key)}
                    disabled={pendingKeys.has(setting.key)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>
        </Card>

        {/* Info Card */}
        <Card className="p-6 bg-slate-50 border-slate-200">
          <div className="flex gap-3">
            <Bell className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-slate-900 mb-1">About Notifications</h3>
              <p className="text-sm text-slate-600">
                Notifications help you stay updated about lunch events, orders, and payments. 
                You can customize which notifications you receive and how you receive them.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default NotificationSettings;
