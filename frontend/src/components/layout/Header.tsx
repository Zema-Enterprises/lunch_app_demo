import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/button';
import { User, LogOut } from 'lucide-react';
import MobileNav from './MobileNav';
import NotificationBell from '../notifications/NotificationBell';

const Header: React.FC = () => {
  const { user, company, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200" role="banner" data-layout-header>
      <div className="px-4 md:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <MobileNav />
          <h1 className="text-2xl font-bold text-slate-900">LunchSync</h1>
          {company && (
            <span className="text-sm text-slate-500 hidden sm:inline" aria-label={`Company: ${company.name}`}>
              {company.name}
            </span>
          )}
        </div>
        
        <nav className="flex items-center gap-4" aria-label="User menu">
          <div className="flex items-center gap-2 hidden sm:flex" aria-label="User information">
            <User className="w-5 h-5 text-slate-600" aria-hidden="true" />
            <span className="text-sm font-medium">{user?.name}</span>
            {user?.role === 'ADMIN' && (
              <span 
                className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                role="status"
                aria-label="Administrator role"
              >
                Admin
              </span>
            )}
          </div>
          
          {/* Notification Bell */}
          <NotificationBell />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="flex items-center gap-2"
            aria-label="Log out of your account"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
