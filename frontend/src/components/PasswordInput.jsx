import { useState } from 'react';
import Icon from './ui/Icon';

export default function PasswordInput({ id, value, onChange, error, autoComplete = 'current-password', placeholder, ...rest }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={show ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} placeholder={placeholder}
        className={`input pr-11 ${error ? 'input-error' : ''}`} aria-invalid={Boolean(error)} {...rest} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}
        className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-ink-400 hover:bg-ink-100 hover:text-ink-700">
        <Icon name={show ? 'eyeOff' : 'eye'} className="h-5 w-5" />
      </button>
    </div>
  );
}
