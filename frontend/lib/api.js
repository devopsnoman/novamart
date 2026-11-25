export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/** Browser-side API call. Goes to /api/* on this site (proxied to the backend). */
export async function apiFetch(path, { method = 'GET', body, token } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
  } catch (err) {
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.');
  }

  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    // empty or non-JSON body
  }

  if (!res.ok) {
    const message = (data && data.error && data.error.message) || 'Something went wrong. Please try again.';
    throw new ApiError(res.status, message, data && data.error ? data.error.details : undefined);
  }
  return data;
}

/** Turns an ApiError (including field validation details) into one readable line. */
export function formatError(err) {
  if (err && err.details && typeof err.details === 'object') {
    const parts = Object.entries(err.details)
      .filter(([, msgs]) => Array.isArray(msgs) && msgs.length > 0)
      .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`);
    if (parts.length > 0) return parts.join('. ');
  }
  return (err && err.message) || 'Something went wrong. Please try again.';
}
