import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { SkipLink } from '../accessibility/SkipLink';
import { useNotificationsRealtime } from '@/lib/realtime/useNotificationsRealtime';
import OfflineBanner from './OfflineBanner';
import { useEffect } from 'react';
import { registerForPushNotifications, isPushFeatureEnabled } from '@/lib/push/push-manager';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';

const Layout: React.FC = () => {
  useNotificationsRealtime();
  const { isAuthenticated } = useAuthStore();
  const { addToast } = useNotificationStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const promptKey = 'notifications:pushPromptShown';
    const shouldPrompt = isAuthenticated && isPushFeatureEnabled() && !localStorage.getItem(promptKey);
    if (!shouldPrompt) return;

    const ask = async () => {
      const consent = window.confirm('Enable push notifications to get alerts even when the app is closed?');
      localStorage.setItem(promptKey, 'true');
      if (!consent) return;
      try {
        const subscription = await registerForPushNotifications();
        if (subscription) {
          addToast({ type: 'success', message: 'Push notifications enabled' });
        } else {
          addToast({ type: 'error', message: 'Push permission was not granted' });
        }
      } catch (error) {
        addToast({ type: 'error', message: 'Failed to enable push notifications' });
      }
    };

    void ask();
  }, [isAuthenticated, addToast]);

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
    </div>
  );
};

export default Layout;
