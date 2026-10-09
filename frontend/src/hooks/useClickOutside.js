import { useEffect } from 'react';

/** Calls `handler` when a pointer event lands outside `ref` (only while `active`). */
export default function useClickOutside(ref, handler, active = true) {
  useEffect(() => {
    if (!active) return undefined;
    const listener = (e) => { if (ref.current && !ref.current.contains(e.target)) handler(e); };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener, { passive: true });
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler, active]);
}
