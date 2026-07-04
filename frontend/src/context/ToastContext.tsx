import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss after 3.5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 3500);
  }, [removeToast]);

  const toastHelpers = React.useMemo(() => ({
    success: (message: string) => addToast(message, 'success'),
    error: (message: string) => addToast(message, 'error'),
    info: (message: string) => addToast(message, 'info'),
  }), [addToast]);

  return (
    <ToastContext.Provider value={{ toast: toastHelpers }}>
      {children}
      
      {/* Toast Overlay Container */}
      <div 
        className="fixed top-6 right-6 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none"
        aria-live="assertive"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role="alert"
            className="flex items-start gap-3 p-4 rounded-xl glass-panel shadow-lg border border-white/10 pointer-events-auto animate-slide-in"
            style={{
              display: 'flex',
              position: 'relative',
              top: 'auto',
              right: 'auto',
              bottom: 'auto',
              left: 'auto',
              borderLeftWidth: '4px',
              borderLeftColor: 
                item.type === 'success' 
                  ? '#10b981' // Green
                  : item.type === 'error'
                  ? '#f43f5e' // Rose Red
                  : '#06b6d4', // Cyan Info
            }}
          >
            {/* Icon */}
            <div className="mt-0.5">
              {item.type === 'success' && (
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {item.type === 'error' && (
                <svg className="w-5 h-5 text-brand-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              {item.type === 'info' && (
                <svg className="w-5 h-5 text-brand-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>

            {/* Content */}
            <div className="flex-1">
              <p className="text-sm font-medium text-zinc-100">{item.message}</p>
            </div>

            {/* Dismiss Close Button */}
            <button
              onClick={() => removeToast(item.id)}
              className="text-zinc-500 hover:text-white transition-colors"
              aria-label="Dismiss notification"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
