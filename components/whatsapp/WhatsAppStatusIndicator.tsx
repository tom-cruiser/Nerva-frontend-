// components/whatsapp/WhatsAppStatusIndicator.tsx
import React from 'react';

type ConnectionStatus = 'DISCONNECTED' | 'AUTHENTICATING' | 'READY' | 'UNAVAILABLE' | 'ERROR';

interface Props {
  status: ConnectionStatus;
  error?: string | null;
  onRetry?: () => void;
}

export const WhatsAppStatusIndicator: React.FC<Props> = ({ status, error, onRetry }) => {
  const statusConfig = {
    'READY': { 
      icon: '🟢', 
      label: 'Connected', 
      className: 'bg-emerald-100 text-emerald-700 border-emerald-200' 
    },
    'AUTHENTICATING': { 
      icon: '🟡', 
      label: 'Authenticating', 
      className: 'bg-amber-100 text-amber-700 border-amber-200' 
    },
    'DISCONNECTED': { 
      icon: '🔴', 
      label: 'Disconnected', 
      className: 'bg-red-100 text-red-700 border-red-200' 
    },
    'UNAVAILABLE': { 
      icon: '⚪', 
      label: 'Unavailable', 
      className: 'bg-gray-100 text-gray-700 border-gray-200' 
    },
    'ERROR': { 
      icon: '❌', 
      label: 'Error', 
      className: 'bg-red-100 text-red-700 border-red-200' 
    },
  };

  const config = statusConfig[status] || statusConfig['DISCONNECTED'];

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${config.className}`}>
      <span className="text-sm">{config.icon}</span>
      <span className="text-sm font-medium">{config.label}</span>
      {error && (
        <span className="text-xs text-red-500 ml-1">({error})</span>
      )}
      {onRetry && status === 'ERROR' && (
        <button 
          onClick={onRetry}
          className="text-xs underline hover:no-underline ml-1"
        >
          Retry
        </button>
      )}
    </div>
  );
};