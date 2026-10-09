import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import Icon from '../components/ui/Icon';

const ToastContext = createContext(null);
const TONES = {
  success: { icon: 'check', cls: 'bg-emerald-500' },
  error: { icon: 'alert', cls: 'bg-red-500' },
  info: { icon: 'info', cls: 'bg-brand-500' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((tone, message) => {
    const id = ++idRef.current;
    setToasts((t) => [...t.slice(-3), { id, tone, message }]);
    setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 3500);
  }, [dismiss]);

  const api = useMemo(() => ({
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => {
          const tone = TONES[t.tone] || TONES.info;
          return (
            <div key={t.id} role="status" className="pointer-events-auto flex w-full max-w-sm animate-fade-in items-start gap-3 rounded-xl bg-ink-900 p-3.5 text-sm text-white shadow-pop">
              <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${tone.cls}`}><Icon name={tone.icon} className="h-3 w-3" strokeWidth={3} /></span>
              <p className="min-w-0 flex-1 break-words">{t.message}</p>
              <button type="button" onClick={() => dismiss(t.id)} className="text-ink-300 hover:text-white" aria-label="Dismiss"><Icon name="close" className="h-4 w-4" /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};
