import { Link } from 'react-router-dom';

export function LogoMark({ className = 'h-9 w-9', light = false }) {
  return (
    <span className={`relative inline-flex ${className} items-center justify-center rounded-[10px] ${light ? 'bg-brand-600' : 'bg-ink-900'} text-white`}>
      <svg viewBox="0 0 32 32" className="h-[62%] w-[62%]" fill="none" aria-hidden="true">
        <circle cx="14" cy="14" r="7" stroke="currentColor" strokeWidth="2.6" />
        <path d="M19.500 19.500 26 26" stroke="#8187f8" strokeWidth="3.200" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export default function Logo({ to = '/', light = false, className = '' }) {
  return (
    <Link to={to} className={`inline-flex items-center gap-2.5 ${className}`} aria-label="SearchIQ home">
      <LogoMark light={light} />
      <span className={`text-xl font-extrabold tracking-tight ${light ? 'text-white' : 'text-ink-900'}`}>
        Search<span className={light ? 'text-brand-300' : 'text-brand-600'}>IQ</span>
      </span>
    </Link>
  );
}
