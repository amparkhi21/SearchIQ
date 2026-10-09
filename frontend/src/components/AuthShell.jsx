import Logo from './ui/Logo';
import Icon from './ui/Icon';

const POINTS = [
  ['sparkles', 'Search in plain language', 'Describe what you need and let AI do the filtering.'],
  ['heart', 'Save what you love', 'Wishlist, cart and orders follow you everywhere.'],
  ['truck', 'Track every order', 'Live status updates from placed to delivered.'],
];

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-ink-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-brand-600/30 blur-3xl" aria-hidden="true" />
        <Logo light />
        <div className="relative">
          <h2 className="max-w-md text-3xl font-bold leading-tight text-white">Shopping that understands what you mean.</h2>
          <ul className="mt-8 space-y-5">
            {POINTS.map(([icon, t, d]) => (
              <li key={t} className="flex gap-4"><span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-brand-200"><Icon name={icon} className="h-5 w-5" /></span>
                <div><p className="text-sm font-semibold text-white">{t}</p><p className="text-sm text-ink-300">{d}</p></div></li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-ink-400">© {new Date().getFullYear()} SearchIQ</p>
      </aside>
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-6 text-center text-sm text-ink-500">{footer}</p>
        </div>
      </main>
    </div>
  );
}
