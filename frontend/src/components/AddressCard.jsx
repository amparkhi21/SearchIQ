export function AddressText({ a }) {
  return (
    <p className="text-sm leading-relaxed text-ink-600">
      {a.fullName} · {a.phone}<br />
      {a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />
      {a.city}, {a.state} {a.postalCode}{a.country && a.country !== 'India' ? `, ${a.country}` : ''}
    </p>
  );
}
