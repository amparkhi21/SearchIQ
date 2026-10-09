import { useEffect, useRef } from 'react';
import Icon from './Icon';

export default function Modal({ open, onClose, title, children, footer, size = 'max-w-lg' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={ref} tabIndex={-1} className={`relative flex max-h-[92vh] w-full ${size} animate-fade-in flex-col rounded-t-2xl bg-white shadow-pop focus:outline-none sm:rounded-2xl`}>
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="btn-icon -mr-2" aria-label="Close"><Icon name="close" /></button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-ink-100 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}
