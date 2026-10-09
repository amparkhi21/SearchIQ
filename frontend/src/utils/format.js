export const formatDate = (value, options = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', options);
};

export const formatDateTime = (value) =>
  formatDate(value, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export const timeAgo = (value) => {
  if (!value) return '';
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (Number.isNaN(seconds)) return '';
  if (seconds < 45) return 'just now';
  const units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [name, size] of units) {
    if (seconds >= size) {
      const n = Math.floor(seconds / size);
      return `${n} ${name}${n > 1 ? 's' : ''} ago`;
    }
  }
  return 'just now';
};

export const formatNumber = (n) => new Intl.NumberFormat('en-IN').format(Number(n) || 0);
export const percent = (fraction, digits = 1) => `${((Number(fraction) || 0) * 100).toFixed(digits)}%`;
