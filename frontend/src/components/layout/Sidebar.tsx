import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, UtensilsCrossed, ShoppingCart, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const DEFAULT_HEADER_HEIGHT = 64; // 4rem fallback

const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/events', icon: Calendar, label: 'Events' },
    { to: '/restaurants', icon: UtensilsCrossed, label: 'Restaurants' },
    { to: '/orders', icon: ShoppingCart, label: 'Orders' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const [stickyOffset, setStickyOffset] = React.useState(DEFAULT_HEADER_HEIGHT);

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
      const nextOffset = Math.max(Math.round(rect.bottom), 0);
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
  const stickyHeight = `calc(100vh - ${topOffset}px)`;

  return (
    <aside
      className="hidden lg:block lg:w-64 lg:flex-shrink-0"
      role="navigation"
      aria-label="Main navigation"
    >
      <nav
        className="lg:sticky overflow-y-auto border-r border-gray-200 bg-white p-4 space-y-2"
        style={{ top: topOffset, maxHeight: stickyHeight, height: stickyHeight }}
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-slate-100 text-slate-900 font-medium'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )
            }
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
