import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { errorMessage } from '../api/axios';
import AuthShell from '../components/AuthShell';
import PasswordInput from '../components/PasswordInput';
import Icon from '../components/ui/Icon';
import { Spinner } from '../components/ui/Loader';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RULES = [
  ['8+ characters', (p) => p.length >= 8],
  ['Lowercase letter', (p) => /[a-z]/.test(p)],
  ['Uppercase letter', (p) => /[A-Z]/.test(p)],
  ['A number', (p) => /\d/.test(p)],
];

export default function Register() {
  const { register, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dest = location.state?.from?.pathname || '/';
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { document.title = 'Create account — SearchIQ'; }, []);

  if (!loading && isAuthenticated && !busy) return <Navigate to={dest} replace />;

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (f.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    if (!EMAIL.test(f.email.trim())) errs.email = 'Enter a valid email address';
    if (!RULES.every(([, ok]) => ok(f.password))) errs.password = 'Password doesn’t meet all the requirements';
    setErrors(errs); setError('');
    if (Object.keys(errs).length) return;
    setBusy(true);
    try { await register({ name: f.name.trim(), email: f.email.trim(), password: f.password }); navigate(dest, { replace: true }); }
    catch (err) { setError(errorMessage(err, 'Registration failed. Please try again.')); setBusy(false); }
  };

  return (
    <AuthShell title="Create your account" subtitle="Save your wishlist, track orders and get personalised picks." footer={<>Already have an account? <Link to="/login" state={location.state} className="link">Sign in</Link></>}>
      <form onSubmit={submit} noValidate className="space-y-5">
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}
        <div>
          <label htmlFor="name" className="field-label">Full name</label>
          <input id="name" autoComplete="name" autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={50} className={`input ${errors.name ? 'input-error' : ''}`} />
          {errors.name && <p className="field-error">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="email" className="field-label">Email</label>
          <input id="email" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={`input ${errors.email ? 'input-error' : ''}`} placeholder="you@example.com" />
          {errors.email && <p className="field-error">{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="password" className="field-label">Password</label>
          <PasswordInput id="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} error={errors.password} />
          <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
            {RULES.map(([label, ok]) => {
              const pass = ok(f.password);
              return <li key={label} className={`flex items-center gap-1.5 text-xs ${pass ? 'text-emerald-700' : 'text-ink-400'}`}><Icon name={pass ? 'check' : 'minus'} className="h-3.5 w-3.5" strokeWidth={2.5} />{label}</li>;
            })}
          </ul>
        </div>
        <button className="btn-primary btn-lg btn-block" disabled={busy}>{busy && <Spinner className="h-5 w-5" />}{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
    </AuthShell>
  );
}
