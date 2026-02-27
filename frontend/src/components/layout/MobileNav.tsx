import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, UtensilsCrossed, ShoppingCart, Settings, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface MobileNavProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ isOpen, setIsOpen }) => {
  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/events', icon: Calendar, label: 'Events' },
    { to: '/restaurants', icon: UtensilsCrossed, label: 'Restaurants' },
    { to: '/orders', icon: ShoppingCart, label: 'Orders' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const handleNavClick = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
          style={{ touchAction: 'none' }}
        />
      )}

      {/* Mobile Menu */}
      <nav
        id="mobile-menu"
        className={cn(
          'fixed top-0 left-0 h-full w-64 bg-white shadow-2xl z-50 transform transition-transform duration-300 lg:hidden overflow-y-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Mobile navigation"
      >
        <div className="p-4 bg-white">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">LunchSync</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </Button>
          </div>

          <div className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={handleNavClick}
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
          </div>
        </div>
      </nav>
    </>
  );
};

export default MobileNav;
