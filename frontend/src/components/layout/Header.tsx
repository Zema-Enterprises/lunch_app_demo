import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/button';
import { User, LogOut, Menu } from 'lucide-react';
import NotificationBell from '../notifications/NotificationBell';
import { useThemeContext } from '@/theme/ThemeProvider';
import { useCompany } from '@/lib/api/hooks';
import { isColorDark, resolveAssetUrl } from '@/theme/utils';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onMobileMenuToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMobileMenuToggle }) => {
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
        <div className="flex items-center gap-3 md:gap-4">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onMobileMenuToggle}
            className="lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="w-6 h-6" aria-hidden="true" />
          </Button>
          <h1
            className="text-2xl font-bold"
            style={{ 
              color: brandColor,
              textShadow: useInvertedTone 
                ? '0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)' 
                : '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
          >
            LunchSync
          </h1>
          {(companyData || company) && (
            <>
              {/* Visual separator */}
              <div 
                className="hidden sm:block w-px h-6"
                style={{
                  backgroundColor: useInvertedTone 
                    ? 'rgba(255, 255, 255, 0.3)' 
                    : 'rgba(15, 23, 42, 0.2)',
                }}
                aria-hidden="true"
              />
              {/* Company name badge */}
              <div
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{
                  backgroundColor: useInvertedTone 
                    ? 'rgba(255, 255, 255, 0.15)' 
                    : 'rgba(15, 23, 42, 0.06)',
                  backdropFilter: 'blur(8px)',
                  border: `1px solid ${useInvertedTone 
                    ? 'rgba(255, 255, 255, 0.25)' 
                    : 'rgba(15, 23, 42, 0.12)'}`,
                  boxShadow: useInvertedTone
                    ? '0 2px 8px rgba(0, 0, 0, 0.15)'
                    : '0 1px 3px rgba(0, 0, 0, 0.08)',
                }}
              >
                <span
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ 
                    color: useInvertedTone ? 'rgba(255, 255, 255, 0.7)' : 'rgba(15, 23, 42, 0.6)',
                    textShadow: useInvertedTone ? '0 1px 2px rgba(0, 0, 0, 0.2)' : 'none',
                  }}
                >
                  Company
                </span>
                <span
                  className="text-sm font-semibold"
                  aria-label={`Company: ${companyData?.name ?? company?.name ?? 'Company'}`}
                  style={{ 
                    color: subtleText,
                    textShadow: useInvertedTone 
                      ? '0 1px 3px rgba(0, 0, 0, 0.25)' 
                      : '0 1px 2px rgba(0, 0, 0, 0.08)',
                  }}
                >
                  {companyData?.name ?? company?.name}
                </span>
              </div>
            </>
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
            <User className={cn("w-5 h-5", useInvertedTone ? "text-slate-200" : "text-slate-500")} aria-hidden="true" />
            <span className={cn("text-sm font-medium", useInvertedTone && "text-slate-50")}>
              {user?.name}
            </span>
            {user?.role === 'ADMIN' && (
              <span
                className={cn("ml-2 px-2 py-1 text-xs rounded-full", isSecondaryDark ? "text-slate-50" : "text-slate-900")}
                style={{ background: theme.secondaryColor }}
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
