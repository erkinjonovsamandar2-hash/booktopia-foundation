import { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from '@phosphor-icons/react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, desc = null) => {
    const id = Date.now();
    setToast({ message, desc, id });
    setTimeout(() => {
      setToast(current => (current?.id === id ? null : current));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          top: 16,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 9999,
          padding: '0 16px',
        }}
      >
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              style={{
                background: 'var(--surface)',
                color: 'var(--text-1)',
                padding: '12px 16px',
                borderRadius: 14,
                boxShadow: 'var(--shadow-card), 0 8px 30px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                borderLeft: '4px solid var(--blue-500)',
                maxWidth: 360,
                width: '100%',
              }}
            >
              <CheckCircle size={24} weight="fill" color="var(--blue-500)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text-1)' }}>
                  {toast.message}
                </p>
                {toast.desc && (
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--text-3)',
                      margin: '2px 0 0',
                      fontWeight: 500,
                      lineHeight: 1.3,
                    }}
                  >
                    {toast.desc}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
