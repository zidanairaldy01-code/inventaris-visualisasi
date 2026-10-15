'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertTriangle, Info, X, ExternalLink } from 'lucide-react';
import { showErrorAlert } from '@/utils/errorHandler';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  details?: string[];
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, details, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const config = {
    success: {
      icon: <CheckCircle className="h-5 w-5" />,
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      textColor: 'text-emerald-900',
      iconColor: 'text-emerald-600',
      progressColor: 'bg-emerald-500',
    },
    error: {
      icon: <XCircle className="h-5 w-5" />,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-900',
      iconColor: 'text-red-600',
      progressColor: 'bg-red-500',
    },
    warning: {
      icon: <AlertTriangle className="h-5 w-5" />,
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-900',
      iconColor: 'text-amber-600',
      progressColor: 'bg-amber-500',
    },
    info: {
      icon: <Info className="h-5 w-5" />,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-900',
      iconColor: 'text-blue-600',
      progressColor: 'bg-blue-500',
    },
  };

  const style = config[type];

  return createPortal(
    <div className="fixed top-20 right-4 z-[9999] animate-in slide-in-from-right-5 duration-300">
      <div className={`flex items-start gap-3 ${style.bgColor} ${style.borderColor} border rounded-xl shadow-lg p-4 min-w-[320px] max-w-md backdrop-blur-sm`}>
        <div className={`shrink-0 ${style.iconColor}`}>
          {style.icon}
        </div>
        <div className={`flex-1 text-sm font-medium ${style.textColor} leading-relaxed`}>
          <div>{message}</div>
          {type === 'error' && (
            <button
              type="button"
              onClick={() => {
                showErrorAlert(
                  details && details.length > 0
                    ? { response: { data: { message, errors: details } } }
                    : message,
                  'Keterangan Detail Error'
                );
                onClose();
              }}
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-red-700 hover:text-red-950 underline cursor-pointer bg-red-100/70 hover:bg-red-200/80 px-2 py-0.5 rounded-md transition-colors"
            >
              <span>Buka Pop-up Keterangan Error</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className={`shrink-0 ${style.textColor} hover:opacity-70 transition-opacity`}
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {/* Progress bar */}
      <div className="h-1 bg-white/30 rounded-full overflow-hidden mt-1">
        <div 
          className={`h-full ${style.progressColor} rounded-full animate-shrink-width`}
          style={{ 
            animation: `shrink-width ${duration}ms linear forwards` 
          }}
        />
      </div>
    </div>,
    document.body
  );
}
