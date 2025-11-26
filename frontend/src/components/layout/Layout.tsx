import React, { useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { SkipLink } from '../accessibility/SkipLink';
import { useNotificationsRealtime } from '@/lib/realtime/useNotificationsRealtime';
import OfflineBanner from './OfflineBanner';
import { useThemeContext } from '@/theme/ThemeProvider';

const Layout: React.FC = () => {
  useNotificationsRealtime();
  const { theme } = useThemeContext();

  const backgroundStyle = useMemo(() => {
    return {
      backgroundColor: '#f8fafc',
    } as React.CSSProperties;
  }, []);

  return (
    <div className="min-h-screen" style={backgroundStyle} data-testid="layout-shell">
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
