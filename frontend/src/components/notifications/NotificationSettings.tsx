import React, { useState, useEffect, useMemo } from 'react';
import { Bell, Mail, Smartphone } from 'lucide-react';
import { useNotificationSettings, useUpdateNotificationSettings, useUserPushSubscriptions } from '@/lib/api/hooks';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { registerForPushNotifications, unsubscribeFromPushNotifications, isPushFeatureEnabled } from '@/lib/push/push-manager';
import { useQueryClient } from '@tanstack/react-query';

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

import { UserNotificationSettings, EditableNotificationKey } from '@/types';

interface NotificationSetting {
  key: EditableNotificationKey;
  label: string;
  description: string;
  icon: string;
}

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
  const { data: pushSubscriptions, isError: pushQueryError, failureReason } = useUserPushSubscriptions();
  const queryClient = useQueryClient();

  const [localSettings, setLocalSettings] = useState<UserNotificationSettings | null>(null);
  const [originalSettings, setOriginalSettings] = useState<UserNotificationSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pushMessage, setPushMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isProcessingPush, setIsProcessingPush] = useState(false);
  const [browserPushStatus, setBrowserPushStatus] = useState<'idle' | 'enabled' | null>(null);
  const [localPushStatus, setLocalPushStatus] = useState<'idle' | 'enabled' | null>(null);
  const pushFeatureEnabled = isPushFeatureEnabled();

  // Auto-clear success/info messages after 5 seconds
  useEffect(() => {
    if (pushMessage && pushMessage.type !== 'error') {
      const timer = setTimeout(() => setPushMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [pushMessage]);

  // Determine if we should use browser fallback (only for network/server errors, not auth errors)
  const isNetworkOrServerError = pushQueryError && (
    !failureReason ||
    (failureReason instanceof Error &&
      !('response' in failureReason && (failureReason as any).response?.status === 401))
  );

  // Fallback: Check browser subscription if backend query fails with network/server error
  useEffect(() => {
    if (!pushFeatureEnabled || !isNetworkOrServerError) {
      setBrowserPushStatus(null);
      return;
    }

    let cancelled = false;

    const checkBrowserSubscription = async () => {
      try {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          if (!cancelled) {
            setBrowserPushStatus(subscription ? 'enabled' : 'idle');
          }
        }
      } catch {
        if (!cancelled) {
          setBrowserPushStatus('idle');
        }
      }
    };

    checkBrowserSubscription();

    return () => {
      cancelled = true;
    };
  }, [pushFeatureEnabled, isNetworkOrServerError]);

  // Per-user push status: backend data > browser fallback > idle
  const pushStatus: 'idle' | 'enabled' = localPushStatus
    ?? (pushSubscriptions?.hasActiveSubscription ? 'enabled' : (browserPushStatus ?? 'idle'));

  // Initialize local settings when data is loaded
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
      setOriginalSettings(settings);
    }
  }, [settings]);

  const editableKeys = useMemo<Array<EditableNotificationKey>>(
    () => ([
      'emailNotifications',
      'inAppNotifications',
      'notifyOnEventCreated',
      'notifyOnUserJoinedEvent',
      'notifyOnEventClosed',
      'notifyOnEventDelivered',
      'notifyOnPaymentConfirmed',
      'notifyOnEventCompleted',
      'notifyOnOrderPlaced',
      'notifyOnOrderUpdated',
      'notifyOnPaymentReminder',
    ]),
    []
  );

  const hasUnsavedChanges = useMemo(() => {
    if (!localSettings || !originalSettings) return false;
    return editableKeys.some((key) => localSettings[key] !== originalSettings[key]);
  }, [editableKeys, localSettings, originalSettings]);

  const handleToggle = (key: EditableNotificationKey) => {
    setLocalSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [key]: !prev[key],
      };
    });
  };

  const handleSave = async () => {
    if (!localSettings || !originalSettings) return;
    const updates: Partial<UserNotificationSettings> = {};
    editableKeys.forEach((key) => {
      if (localSettings[key] !== originalSettings[key]) {
        updates[key] = localSettings[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateSettings.mutateAsync(updates);
      setOriginalSettings(updated);
      setLocalSettings(updated);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (originalSettings) {
      setLocalSettings(originalSettings);
    }
  };

  const handleEnablePush = async () => {
    if (!pushFeatureEnabled) {
      setPushMessage({ text: 'Push notifications are currently unavailable.', type: 'error' });
      return;
    }
    setIsProcessingPush(true);
    setPushMessage(null);
    try {
      const subscription = await registerForPushNotifications();
      if (subscription) {
        // Refetch user's subscriptions to update status
        await queryClient.invalidateQueries({ queryKey: ['push-subscriptions'] });
        setLocalPushStatus('enabled');
        setPushMessage({ text: 'Push notifications enabled successfully.', type: 'success' });
      } else {
        setPushMessage({ text: 'Push notifications permission was not granted.', type: 'info' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('production build') || message.includes('Service worker')) {
        setPushMessage({
          text: 'Push notifications require a production build. Run "npm run build" and serve the dist folder.',
          type: 'error'
        });
      } else if (message.includes('timeout') || message.includes('aborted')) {
        setPushMessage({ text: 'Request timed out. Please check your connection and try again.', type: 'error' });
      } else {
        // Show the actual error message from the backend
        setPushMessage({ text: message, type: 'error' });
      }
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
        // Refetch user's subscriptions to update status
        await queryClient.invalidateQueries({ queryKey: ['push-subscriptions'] });
        setLocalPushStatus('idle');
        setPushMessage({ text: 'Push notifications disabled.', type: 'success' });
      } else {
        setPushMessage({ text: 'No active push subscription found.', type: 'info' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to disable push notifications';
      setPushMessage({ text: message, type: 'error' });
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

      {hasUnsavedChanges && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-medium">You have unsaved changes</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              Reset
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}

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
                  {isProcessingPush
                    ? 'Processing...'
                    : pushFeatureEnabled
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
                  <p className={`text-xs text-right max-w-xs ${
                    pushMessage.type === 'error'
                      ? 'text-red-600'
                      : pushMessage.type === 'success'
                        ? 'text-green-600'
                        : 'text-slate-500'
                  }`}>
                    {pushMessage.text}
                  </p>
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
