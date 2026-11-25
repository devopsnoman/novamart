const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatPrice(cents) {
  return money.format(cents / 100);
}

export function formatDate(value) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Only allow redirects to paths inside this site. */
export function getNextPath() {
  if (typeof window === 'undefined') return '/';
  const next = new URLSearchParams(window.location.search).get('next');
  if (next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\')) {
    return next;
  }
  return '/';
}
