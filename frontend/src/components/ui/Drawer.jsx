import { useEffect, useRef } from 'react';
import Icon from './Icon';

/** Accessible slide-over / bottom-sheet. side: 'left' | 'right' | 'bottom' */
export default function Drawer({ open, onClose, title, side = 'left', children, footer, width = 'max-w-sm' }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  const position =
    side === 'right' ? `right-0 top-0 h-full w-full ${width} animate-slide-in-right`
    : side === 'bottom' ? 'bottom-0 left-0 right-0 max-h-[88vh] rounded-t-2xl animate-fade-in'
    : `left-0 top-0 h-full w-full ${width} animate-slide-in`;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={panelRef} tabIndex={-1} className={`absolute flex flex-col bg-white shadow-pop focus:outline-none ${position}`}>
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3.5">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="btn-icon -mr-2" aria-label="Close"><Icon name="close" /></button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>
        {footer && <div className="safe-bottom border-t border-ink-100 p-4">{footer}</div>}
      </div>
    </div>
  );
}
