import { Outlet, Link, useLocation } from 'react-router-dom';
import { User, Building, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeContext } from '@/theme/ThemeProvider';

export default function SettingsLayout() {
  const location = useLocation();
  const { theme } = useThemeContext();

  const isProfileActive = location.pathname.endsWith('/settings') || location.pathname.endsWith('/settings/profile');
  const isCompanyActive = location.pathname.endsWith('/settings/company');
  const isNotificationsActive = location.pathname.endsWith('/settings/notifications');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and company settings</p>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b">
        <nav className="flex gap-6">
          <Link
            to="/settings/profile"
            className={cn(
              'flex items-center gap-2 px-4 py-2 border-b-2 font-medium transition-colors',
              isProfileActive
                ? ''
                : 'border-transparent text-gray-600 hover:text-gray-900'
            )}
            style={isProfileActive ? { borderBottomColor: theme.primaryColor, color: theme.primaryColor } : undefined}
          >
            <User className="h-4 w-4" />
            Profile
          </Link>
          <Link
            to="/settings/company"
            className={cn(
              'flex items-center gap-2 px-4 py-2 border-b-2 font-medium transition-colors',
              isCompanyActive
                ? ''
                : 'border-transparent text-gray-600 hover:text-gray-900'
            )}
            style={isCompanyActive ? { borderBottomColor: theme.primaryColor, color: theme.primaryColor } : undefined}
          >
            <Building className="h-4 w-4" />
            Company
          </Link>
          <Link
            to="/settings/notifications"
            className={cn(
              'flex items-center gap-2 px-4 py-2 border-b-2 font-medium transition-colors',
              isNotificationsActive
                ? ''
                : 'border-transparent text-gray-600 hover:text-gray-900'
            )}
            style={isNotificationsActive ? { borderBottomColor: theme.primaryColor, color: theme.primaryColor } : undefined}
          >
            <Bell className="h-4 w-4" />
            Notifications
          </Link>
        </nav>
      </div>

      {/* Content */}
      <div>
        <Outlet />
      </div>
    </div>
  );
}
