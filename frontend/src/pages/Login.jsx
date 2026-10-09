import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { errorMessage } from '../api/axios';
import AuthShell from '../components/AuthShell';
import PasswordInput from '../components/PasswordInput';
import { Spinner } from '../components/ui/Loader';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dest = location.state?.from?.pathname ? `${location.state.from.pathname}${location.state.from.search || ''}` : '/';
  const [f, setF] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { document.title = 'Sign in — SearchIQ'; }, []);

  if (!loading && isAuthenticated && !busy) return <Navigate to={dest} replace />;

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!EMAIL.test(f.email.trim())) errs.email = 'Enter a valid email address';
    if (!f.password) errs.password = 'Enter your password';
    setErrors(errs); setError('');
    if (Object.keys(errs).length) return;
    setBusy(true);
    try { await login({ email: f.email.trim(), password: f.password }); navigate(dest, { replace: true }); }
    catch (err) { setError(errorMessage(err, 'Sign in failed. Please try again.')); setBusy(false); }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to access your cart, orders and recommendations." footer={<>New to SearchIQ? <Link to="/register" state={location.state} className="link">Create an account</Link></>}>
      <form onSubmit={submit} noValidate className="space-y-5">
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}
        <div>
          <label htmlFor="email" className="field-label">Email</label>
          <input id="email" type="email" autoComplete="email" autoFocus value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={`input ${errors.email ? 'input-error' : ''}`} placeholder="you@example.com" aria-invalid={Boolean(errors.email)} />
          {errors.email && <p className="field-error">{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="password" className="field-label">Password</label>
          <PasswordInput id="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} error={errors.password} />
          {errors.password && <p className="field-error">{errors.password}</p>}
        </div>
        <button className="btn-primary btn-lg btn-block" disabled={busy}>{busy && <Spinner className="h-5 w-5" />}{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </AuthShell>
  );
}
