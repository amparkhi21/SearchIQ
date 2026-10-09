const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function formatCurrency(value) {
  return inr.format(Number(value) || 0);
}
