import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/button';
import { User, LogOut } from 'lucide-react';
import MobileNav from './MobileNav';
import NotificationBell from '../notifications/NotificationBell';
import { useThemeContext } from '@/theme/ThemeProvider';
import { useCompany } from '@/lib/api/hooks';
import { isColorDark, resolveAssetUrl } from '@/theme/utils';

const Header: React.FC = () => {
  const { user, company, logout } = useAuthStore();
  const { data: companyData } = useCompany();
  const navigate = useNavigate();
  const { theme } = useThemeContext();
  const coverUrl = resolveAssetUrl(theme.coverPhotoUrl);
  const coverActive = Boolean(coverUrl);
  const useInvertedTone = coverActive || isColorDark(theme.backgroundColor);
  const subtleText = theme.primaryColor;
  const brandColor = useInvertedTone ? '#f8fafc' : '#0f172a';
  const isSecondaryDark = isColorDark(theme.secondaryColor);
  const navBackground = useInvertedTone ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.06)';
  const navBorder = useInvertedTone ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(15,23,42,0.12)';
  const hoverBg = useInvertedTone
    ? 'rgba(255,255,255,0.2)'
    : `color-mix(in srgb, ${theme.primaryColor} 12%, white)`;
  const [isLogoutHover, setIsLogoutHover] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header
      className="border-b"
      role="banner"
      data-layout-header
      style={{
        backgroundImage: coverUrl
          ? `linear-gradient(120deg, rgba(15,23,42,0.75) 0%, rgba(15,23,42,0.55) 45%, rgba(15,23,42,0.3) 100%), url(${coverUrl})`
          : undefined,
        backgroundColor: coverUrl ? undefined : theme.backgroundColor,
        backgroundSize: coverUrl ? 'cover' : undefined,
        backgroundRepeat: coverUrl ? 'no-repeat' : undefined,
        backgroundPosition: coverUrl ? 'center' : undefined,
        borderColor: useInvertedTone ? 'rgba(255,255,255,0.18)' : theme.primaryColor,
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="px-4 md:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <MobileNav />
          <h1
            className="text-2xl font-bold"
            style={{ color: brandColor }}
          >
            LunchSync
          </h1>
          {(companyData || company) && (
            <span
              className="text-sm font-medium hidden sm:inline"
              aria-label={`Company: ${companyData?.name ?? company?.name ?? 'Company'}`}
              style={{ color: subtleText }}
            >
              {companyData?.name ?? company?.name}
            </span>
          )}
        </div>
        
        <nav
          className="flex items-center gap-4 px-4 py-2 rounded-full"
          aria-label="User menu"
          style={{
            background: navBackground,
            border: navBorder,
            backdropFilter: coverUrl ? 'blur(8px)' : undefined,
          }}
        >
          <div className="flex items-center gap-2 hidden sm:flex" aria-label="User information">
            <User className="w-5 h-5" aria-hidden="true" style={{ color: useInvertedTone ? '#e2e8f0' : 'rgb(71 85 105)' }} />
            <span className="text-sm font-medium" style={{ color: useInvertedTone ? '#f8fafc' : undefined }}>
              {user?.name}
            </span>
            {user?.role === 'ADMIN' && (
              <span 
                className="ml-2 px-2 py-1 text-xs rounded-full"
                style={{
                  background: theme.secondaryColor,
                  color: isSecondaryDark ? '#f8fafc' : '#0f172a',
                }}
                role="status"
                aria-label="Administrator role"
              >
                Admin
              </span>
            )}
          </div>
          
          {/* Notification Bell */}
          <NotificationBell tone={useInvertedTone ? 'inverted' : 'default'} />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="flex items-center gap-2 transition-colors"
            onMouseEnter={() => setIsLogoutHover(true)}
            onMouseLeave={() => setIsLogoutHover(false)}
            aria-label="Log out of your account"
            style={{
              color: useInvertedTone ? '#f8fafc' : theme.primaryColor,
              background: isLogoutHover ? hoverBg : 'transparent',
            }}
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
