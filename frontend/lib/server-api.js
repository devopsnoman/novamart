import { ApiError } from '@/lib/api';

/** Server-side fetch used by server components. Reads API_URL at runtime. */
export async function serverFetch(path) {
  const base = (process.env.API_URL || 'http://localhost:4000').replace(/\/+$/, '');
  let res;
  try {
    res = await fetch(`${base}${path}`, { cache: 'no-store' });
  } catch (err) {
    throw new ApiError(0, 'The store backend is not reachable.');
  }

  if (!res.ok) {
    let message = 'The store backend returned an error.';
    try {
      const data = await res.json();
      if (data && data.error && data.error.message) message = data.error.message;
    } catch (err) {
      // ignore
    }
    throw new ApiError(res.status, message);
  }
  return res.json();
}
