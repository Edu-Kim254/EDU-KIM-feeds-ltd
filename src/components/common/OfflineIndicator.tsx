import React from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
        isOnline
          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
          : 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
      }`}
      title={
        isOnline
          ? 'Connected: Database synced'
          : 'Offline Mode: Transactions saved locally and will sync when reconnected'
      }
    >
      {isOnline ? (
        <>
          <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
          <span className="hidden sm:inline">Online</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5 text-amber-700" />
          <span>Offline Mode</span>
        </>
      )}
    </div>
  );
};
