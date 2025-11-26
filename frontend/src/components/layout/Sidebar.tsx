import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, UtensilsCrossed, ShoppingCart, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeContext } from '@/theme/ThemeProvider';

const DEFAULT_HEADER_HEIGHT = 64; // 4rem fallback

const Sidebar: React.FC = () => {
  const { theme } = useThemeContext();
  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/events', icon: Calendar, label: 'Events' },
    { to: '/restaurants', icon: UtensilsCrossed, label: 'Restaurants' },
    { to: '/orders', icon: ShoppingCart, label: 'Orders' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const [stickyOffset, setStickyOffset] = React.useState(DEFAULT_HEADER_HEIGHT);
  const [hovered, setHovered] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const header = document.querySelector('[data-layout-header]') as HTMLElement | null;
    if (!header) {
      return;
    }

    const updateMetrics = () => {
      const rect = header.getBoundingClientRect();
      const nextOffset = Math.max(Math.floor(rect.bottom), 0);
      setStickyOffset((prev) => (prev === nextOffset ? prev : nextOffset));
    };

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => updateMetrics());
      resizeObserver.observe(header);
    }

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        updateMetrics();
        ticking = false;
      });
    };

    updateMetrics();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateMetrics);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateMetrics);
    };
  }, []);

  const topOffset = Math.max(stickyOffset, 0);
  const stickyHeight = `calc(100vh - ${topOffset + 4}px)`;

  return (
    <aside
      className="hidden lg:block lg:w-64 lg:flex-shrink-0"
      role="navigation"
      aria-label="Main navigation"
    >
      <nav
        className="lg:sticky overflow-y-auto border-r border-gray-200 bg-white p-4 space-y-2"
        style={{
          top: topOffset,
          maxHeight: stickyHeight,
          height: stickyHeight,
          background: 'rgba(255,255,255,0.9)',
          borderColor: theme.primaryColor,
        }}
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onMouseEnter={() => setHovered(item.to)}
            onMouseLeave={() => setHovered((prev) => (prev === item.to ? null : prev))}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium',
                isActive ? '' : 'text-slate-700'
              )
            }
            style={({ isActive }) => ({
              background: isActive
                ? `color-mix(in srgb, ${theme.primaryColor} 16%, white)`
                : hovered === item.to
                  ? `color-mix(in srgb, ${theme.primaryColor} 10%, white)`
                  : 'transparent',
              color: isActive || hovered === item.to ? theme.primaryColor : undefined,
            })}
            aria-label={`Navigate to ${item.label}`}
            >
            <item.icon className="w-5 h-5" aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
