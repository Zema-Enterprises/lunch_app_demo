import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="bg-amber-100 border-b border-amber-300 text-amber-900 px-4 py-2 flex items-center gap-2 text-sm">
      <WifiOff className="w-4 h-4" />
      <span>You are offline. Some actions will sync when connection is restored.</span>
    </div>
  );
};

export default OfflineBanner;
