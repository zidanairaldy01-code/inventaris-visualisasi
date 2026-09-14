'use client';

import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';

interface AlertDialogProps {
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  buttonText?: string;
  onClose: () => void;
}

export default function AlertDialog({
  title,
  message,
  type = 'info',
  buttonText = 'Mengerti',
  onClose,
}: AlertDialogProps) {
  const config = {
    success: {
      icon: <CheckCircle className="h-6 w-6" />,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      button: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500',
    },
    error: {
      icon: <XCircle className="h-6 w-6" />,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    },
    warning: {
      icon: <AlertTriangle className="h-6 w-6" />,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      button: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
    },
    info: {
      icon: <Info className="h-6 w-6" />,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    },
  };

  const style = config[type];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Content */}
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className={`flex-shrink-0 ${style.iconBg} rounded-xl p-3 ${style.iconColor}`}>
              {style.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {title}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {message}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Action Button */}
          <button
            onClick={onClose}
            className={`w-full px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-all shadow-sm ${style.button} focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
