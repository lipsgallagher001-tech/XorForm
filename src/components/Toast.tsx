import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

export const ToastItem: React.FC<ToastItemProps> = ({ 
  toast, 
  onDismiss 
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const config = {
    success: {
      icon: <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />,
      badgeBg: 'bg-emerald-50 border-emerald-200/80 text-emerald-900',
      progressBar: 'bg-emerald-500'
    },
    error: {
      icon: <AlertCircle className="text-red-500 shrink-0" size={18} />,
      badgeBg: 'bg-red-50 border-red-200/80 text-red-900',
      progressBar: 'bg-red-500'
    },
    warning: {
      icon: <AlertTriangle className="text-amber-500 shrink-0" size={18} />,
      badgeBg: 'bg-amber-50 border-amber-200/80 text-amber-900',
      progressBar: 'bg-amber-500'
    },
    info: {
      icon: <Info className="text-blue-500 shrink-0" size={18} />,
      badgeBg: 'bg-blue-50 border-blue-200/80 text-blue-900',
      progressBar: 'bg-blue-500'
    }
  }[toast.type];

  return (
    <div 
      role="alert"
      className={`relative overflow-hidden flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all animate-toast-in ${config.badgeBg} max-w-sm w-full`}
    >
      <div className="pt-0.5">{config.icon}</div>
      <div className="flex-1 min-w-0 pr-2">
        {toast.title && (
          <p className="text-xs font-bold tracking-tight mb-0.5 text-foreground">
            {toast.title}
          </p>
        )}
        <p className="text-xs font-medium leading-relaxed opacity-90 whitespace-pre-line break-words">
          {toast.message}
        </p>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-muted-foreground/60 hover:text-foreground transition-colors p-1 rounded-lg hover:bg-black/5 shrink-0 -mr-1 -mt-1 cursor-pointer"
        aria-label="Fermer"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div 
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 pointer-events-auto"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
