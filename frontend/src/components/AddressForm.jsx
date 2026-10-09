import { useState } from 'react';
import { errorMessage } from '../api/axios';
import { Spinner } from './ui/Loader';

const EMPTY = { label: 'Home', fullName: '', phone: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: 'India', isDefault: false };
const PHONE = /^\+?[0-9\s-]{7,15}$/;
const POSTAL = /^[A-Za-z0-9\s-]{3,12}$/;

function validate(f) {
  const e = {};
  if (f.fullName.trim().length < 2) e.fullName = 'Enter the recipient’s full name';
  if (!PHONE.test(f.phone.trim())) e.phone = 'Enter a valid phone number (7–15 digits)';
  if (f.line1.trim().length < 3) e.line1 = 'Enter your street address';
  if (f.city.trim().length < 2) e.city = 'Enter a city';
  if (f.state.trim().length < 2) e.state = 'Enter a state';
  if (!POSTAL.test(f.postalCode.trim())) e.postalCode = 'Enter a valid postal code';
  return e;
}

function Field({ id, label, error, className = '', children }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className="field-label">{label}</label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

/** Used by Profile and Checkout. `onSubmit(payload)` must return a promise. */
export default function AddressForm({ initial, onSubmit, onCancel, submitLabel = 'Save address', defaultName = '', defaultPhone = '' }) {
  const [f, setF] = useState({ ...EMPTY, fullName: defaultName, phone: defaultPhone, ...initial });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const cls = (k) => `input ${errors[k] ? 'input-error' : ''}`;

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(f);
    setErrors(errs);
    setServerError('');
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const payload = {
        label: f.label.trim() || 'Home', fullName: f.fullName.trim(), phone: f.phone.trim(), line1: f.line1.trim(),
        city: f.city.trim(), state: f.state.trim(), postalCode: f.postalCode.trim(), country: f.country.trim() || 'India', isDefault: Boolean(f.isDefault),
      };
      if (f.line2.trim()) payload.line2 = f.line2.trim();
      await onSubmit(payload);
    } catch (err) {
      setServerError(errorMessage(err, 'Could not save the address'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {serverError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="a-label" label="Label"><input id="a-label" className="input" value={f.label} onChange={set('label')} maxLength={30} placeholder="Home, Work…" /></Field>
        <Field id="a-name" label="Full name" error={errors.fullName}><input id="a-name" className={cls('fullName')} value={f.fullName} onChange={set('fullName')} autoComplete="name" /></Field>
        <Field id="a-phone" label="Phone" error={errors.phone}><input id="a-phone" type="tel" className={cls('phone')} value={f.phone} onChange={set('phone')} autoComplete="tel" /></Field>
        <Field id="a-postal" label="Postal code" error={errors.postalCode}><input id="a-postal" className={cls('postalCode')} value={f.postalCode} onChange={set('postalCode')} autoComplete="postal-code" /></Field>
        <Field id="a-l1" label="Address line 1" error={errors.line1} className="sm:col-span-2"><input id="a-l1" className={cls('line1')} value={f.line1} onChange={set('line1')} autoComplete="address-line1" /></Field>
        <Field id="a-l2" label="Address line 2 (optional)" className="sm:col-span-2"><input id="a-l2" className="input" value={f.line2} onChange={set('line2')} autoComplete="address-line2" /></Field>
        <Field id="a-city" label="City" error={errors.city}><input id="a-city" className={cls('city')} value={f.city} onChange={set('city')} autoComplete="address-level2" /></Field>
        <Field id="a-state" label="State" error={errors.state}><input id="a-state" className={cls('state')} value={f.state} onChange={set('state')} autoComplete="address-level1" /></Field>
      </div>
      <label className="flex items-center gap-2.5 text-sm text-ink-700">
        <input type="checkbox" checked={f.isDefault} onChange={set('isDefault')} className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
        Make this my default address
      </label>
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" disabled={saving}>{saving && <Spinner className="h-4 w-4" />}{submitLabel}</button>
        {onCancel && <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
