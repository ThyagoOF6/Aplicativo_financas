import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { CheckCircle, AlertTriangle, Info, XCircle, X } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

const ICONS = {
  success: CheckCircle,
  warning: AlertTriangle,
  info: Info,
  error: XCircle
};

const COLORS = {
  success: 'var(--success-color)',
  warning: 'var(--warning-color)',
  info: 'var(--accent-color)',
  error: 'var(--danger-color)'
};

const BG_COLORS = {
  success: 'var(--success-bg)',
  warning: 'var(--warning-bg)',
  info: 'var(--accent-glow)',
  error: 'var(--danger-bg)'
};

let toastId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type, exiting: false }]);

    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 350);
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 350);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => {
          const Icon = ICONS[toast.type] || ICONS.info;
          return (
            <div
              key={toast.id}
              className={`toast-item ${toast.exiting ? 'toast-exit' : 'toast-enter'}`}
              style={{
                borderLeft: `3px solid ${COLORS[toast.type]}`,
                background: BG_COLORS[toast.type]
              }}
            >
              <Icon size={18} style={{ color: COLORS[toast.type], flexShrink: 0 }} />
              <span className="toast-message">{toast.message}</span>
              <button
                className="toast-close"
                onClick={() => removeToast(toast.id)}
                aria-label="Fechar"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
