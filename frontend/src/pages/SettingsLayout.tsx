import { Outlet, Link, useLocation } from 'react-router-dom';
import { User, Building } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsLayout() {
  const location = useLocation();
  const isProfileActive = location.pathname === '/settings' || location.pathname === '/settings/profile';
  const isCompanyActive = location.pathname === '/settings/company';

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
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            )}
          >
            <User className="h-4 w-4" />
            Profile
          </Link>
          <Link
            to="/settings/company"
            className={cn(
              'flex items-center gap-2 px-4 py-2 border-b-2 font-medium transition-colors',
              isCompanyActive
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            )}
          >
            <Building className="h-4 w-4" />
            Company
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
