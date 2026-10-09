import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as userApi from '../api/user.api';
import { errorMessage } from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/ui/PageHeader';
import PasswordInput from '../components/PasswordInput';
import AddressForm from '../components/AddressForm';
import { AddressText } from '../components/AddressCard';
import Icon from '../components/ui/Icon';
import Modal from '../components/ui/Modal';
import { RowSkeleton } from '../components/ui/Skeletons';
import { Spinner } from '../components/ui/Loader';
import { formatDate } from '../utils/format';

const PHONE = /^\+?[0-9\s-]{7,15}$/;
const PASSWORD_OK = (p) => p.length >= 8 && p.length <= 72 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p);

function PersonalInfo({ profile, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ name: profile.name || '', phone: profile.phone || '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const dirty = f.name.trim() !== (profile.name || '') || f.phone.trim() !== (profile.phone || '');

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (f.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    if (f.phone.trim() && !PHONE.test(f.phone.trim())) errs.phone = 'Enter a valid phone number';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const d = await userApi.updateProfile({ name: f.name.trim(), phone: f.phone.trim() || null });
      onSaved(d.user);
      toast.success('Profile updated');
    } catch (err) { toast.error(errorMessage(err, 'Could not update your profile')); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="p-name" className="field-label">Full name</label><input id="p-name" className={`input ${errors.name ? 'input-error' : ''}`} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={50} />{errors.name && <p className="field-error">{errors.name}</p>}</div>
        <div><label htmlFor="p-phone" className="field-label">Phone</label><input id="p-phone" type="tel" className={`input ${errors.phone ? 'input-error' : ''}`} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+91 98765 43210" />{errors.phone && <p className="field-error">{errors.phone}</p>}</div>
        <div className="sm:col-span-2"><label htmlFor="p-email" className="field-label">Email</label><input id="p-email" className="input" value={profile.email} disabled /><p className="field-hint">Email can’t be changed.</p></div>
      </div>
      <button className="btn-primary" disabled={!dirty || saving}>{saving && <Spinner className="h-4 w-4" />}Save changes</button>
    </form>
  );
}

function PasswordForm() {
  const toast = useToast();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [f, setF] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!f.currentPassword) errs.currentPassword = 'Enter your current password';
    if (!PASSWORD_OK(f.newPassword)) errs.newPassword = '8+ characters with an uppercase letter, a lowercase letter and a number';
    else if (f.newPassword === f.currentPassword) errs.newPassword = 'New password must differ from the current one';
    if (f.confirm !== f.newPassword) errs.confirm = 'Passwords do not match';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      await userApi.changePassword({ currentPassword: f.currentPassword, newPassword: f.newPassword });
      toast.success('Password updated — please sign in again');
      await logout(); // the server revokes every session when the password changes
      navigate('/login', { replace: true });
    } catch (err) { toast.error(errorMessage(err, 'Could not change your password')); setSaving(false); }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div><label htmlFor="pw-cur" className="field-label">Current password</label><PasswordInput id="pw-cur" value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} error={errors.currentPassword} />{errors.currentPassword && <p className="field-error">{errors.currentPassword}</p>}</div>
      <div><label htmlFor="pw-new" className="field-label">New password</label><PasswordInput id="pw-new" autoComplete="new-password" value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} error={errors.newPassword} />{errors.newPassword && <p className="field-error">{errors.newPassword}</p>}</div>
      <div><label htmlFor="pw-con" className="field-label">Confirm new password</label><PasswordInput id="pw-con" autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} error={errors.confirm} />{errors.confirm && <p className="field-error">{errors.confirm}</p>}</div>
      <button className="btn-primary" disabled={saving}>{saving && <Spinner className="h-4 w-4" />}Update password</button>
      <p className="field-hint">You’ll be signed out on all devices after changing your password.</p>
    </form>
  );
}

export default function Profile() {
  const { updateUser } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [removing, setRemoving] = useState('');

  useEffect(() => {
    document.title = 'Profile — SearchIQ';
    userApi.getProfile().then((d) => setProfile(d.user)).catch((e) => setError(errorMessage(e, 'Could not load your profile')));
  }, []);

  const saved = (user) => { setProfile(user); updateUser(user); };
  const addAddress = async (payload) => {
    const d = await userApi.addAddress(payload);
    setProfile((p) => ({ ...p, addresses: d.addresses }));
    setAddOpen(false);
    toast.success('Address added');
  };
  const removeAddress = async (id) => {
    if (!window.confirm('Remove this address?')) return;
    setRemoving(id);
    try { const d = await userApi.removeAddress(id); setProfile((p) => ({ ...p, addresses: d.addresses })); toast.success('Address removed'); }
    catch (e) { toast.error(errorMessage(e, 'Could not remove the address')); } finally { setRemoving(''); }
  };

  if (error) return <div className="page"><p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p></div>;
  if (!profile) return <div className="page"><RowSkeleton rows={3} /></div>;

  return (
    <div className="page max-w-5xl">
      <PageHeader eyebrow="Account" title="Your profile" />
      <div className="mb-6 flex items-center gap-4 rounded-xl border border-ink-100 bg-white p-5 shadow-card">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-ink-900 text-xl font-bold text-white">{(profile.name || '?')[0].toUpperCase()}</span>
        <div className="min-w-0"><p className="truncate text-lg font-semibold">{profile.name}</p><p className="truncate text-sm text-ink-500">{profile.email}</p>
          <p className="mt-0.5 text-xs text-ink-400">{profile.role === 'admin' && <span className="badge-brand mr-2">Admin</span>}{profile.createdAt && `Member since ${formatDate(profile.createdAt)}`}</p></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card-pad"><h2 className="mb-4 text-base font-semibold">Personal information</h2><PersonalInfo profile={profile} onSaved={saved} /></section>
        <section className="card-pad"><h2 className="mb-4 text-base font-semibold">Change password</h2><PasswordForm /></section>
      </div>

      <section className="card-pad mt-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Saved addresses</h2>
          <button type="button" className="btn-secondary btn-sm" onClick={() => setAddOpen(true)}><Icon name="plus" className="h-4 w-4" />Add address</button>
        </div>
        {(profile.addresses || []).length === 0 ? (
          <p className="rounded-lg bg-ink-50 p-4 text-sm text-ink-500">You haven’t saved any addresses yet.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {profile.addresses.map((a) => (
              <li key={a.id} className="flex flex-col rounded-xl border border-ink-200 p-4">
                <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold"><Icon name="map" className="h-4 w-4 text-brand-600" />{a.label || 'Address'}{a.isDefault && <span className="badge-brand">Default</span>}</div>
                <AddressText a={a} />
                <button type="button" onClick={() => removeAddress(a.id)} disabled={removing === a.id} className="mt-3 inline-flex items-center gap-1 self-start text-sm font-medium text-ink-500 hover:text-red-600"><Icon name="trash" className="h-4 w-4" />Remove</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add a new address" size="max-w-2xl">
        <AddressForm onSubmit={addAddress} onCancel={() => setAddOpen(false)} defaultName={profile.name} defaultPhone={profile.phone || ''} initial={{ isDefault: (profile.addresses || []).length === 0 }} />
      </Modal>
    </div>
  );
}
