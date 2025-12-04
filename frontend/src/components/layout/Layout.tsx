import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { SkipLink } from '../accessibility/SkipLink';
import { useNotificationsRealtime } from '@/lib/realtime/useNotificationsRealtime';
import OfflineBanner from './OfflineBanner';
import { useEffect } from 'react';
import { registerForPushNotifications, isPushFeatureEnabled, getSubscriptionStatus } from '@/lib/push/push-manager';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import PushPermissionModal from '@/components/notifications/PushPermissionModal';

const Layout: React.FC = () => {
  useNotificationsRealtime();
  const { isAuthenticated } = useAuthStore();
  const { addToast } = useNotificationStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPushModal, setShowPushModal] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState(false);

  useEffect(() => {
    const promptKey = 'notifications:pushPromptShown';

    const checkAndPrompt = async () => {
      // Don't show if not authenticated, feature disabled, or already shown
      if (!isAuthenticated || !isPushFeatureEnabled() || localStorage.getItem(promptKey)) {
        return;
      }

      // Check if push is already enabled
      try {
        const status = await getSubscriptionStatus();
        if (status === 'enabled' || status === 'denied') {
          localStorage.setItem(promptKey, 'true');
          return;
        }
      } catch {
        // Continue to show modal if check fails
      }

      // Small delay for better UX - let the page settle
      setTimeout(() => {
        setShowPushModal(true);
      }, 1500);
    };

    checkAndPrompt();
  }, [isAuthenticated]);

  const handleEnablePush = async () => {
    setIsPushLoading(true);
    localStorage.setItem('notifications:pushPromptShown', 'true');

    try {
      const subscription = await registerForPushNotifications();
      setShowPushModal(false);
      if (subscription) {
        addToast({ type: 'success', message: 'Push notifications enabled!' });
      } else {
        addToast({ type: 'error', message: 'Push permission was not granted. You can enable it later in Settings.' });
      }
    } catch (error) {
      setShowPushModal(false);
      addToast({ type: 'error', message: 'Failed to enable push notifications. Please try again in Settings.' });
    } finally {
      setIsPushLoading(false);
    }
  };

  const handleDismissPush = () => {
    localStorage.setItem('notifications:pushPromptShown', 'true');
    setShowPushModal(false);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]" data-testid="layout-shell">
      <SkipLink />
      <OfflineBanner />
      <MobileNav isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
      <Header onMobileMenuToggle={() => setIsMobileMenuOpen(true)} />
      <div className="flex">
        <Sidebar />
        <main 
          id="main-content"
          className="flex-1 p-4 sm:p-6"
          role="main"
          aria-label="Main content"
        >
          <Outlet />
        </main>
      </div>

      {/* Push Permission Modal */}
      <PushPermissionModal
        isOpen={showPushModal}
        onEnable={handleEnablePush}
        onDismiss={handleDismissPush}
        isLoading={isPushLoading}
      />
    </div>
  );
};

export default Layout;

