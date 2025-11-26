import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { SkipLink } from '../accessibility/SkipLink';
import { useNotificationsRealtime } from '@/lib/realtime/useNotificationsRealtime';
import OfflineBanner from './OfflineBanner';

const Layout: React.FC = () => {
  useNotificationsRealtime();

  return (
    <div className="min-h-screen bg-[#f8fafc]" data-testid="layout-shell">
      <SkipLink />
      <OfflineBanner />
      <Header />
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
