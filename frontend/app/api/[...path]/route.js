// Forwards /api/* from the browser to the backend. The backend address is read
// from API_URL at request time, so one built image works in every environment.
export const dynamic = 'force-dynamic';

const FORWARDED_HEADERS = ['authorization', 'content-type', 'accept', 'x-forwarded-for'];
const NO_BODY_STATUSES = [204, 205, 304];

async function proxy(request, { params }) {
  const { path } = await params;
  const segments = path || [];
  if (segments.some((s) => s === '.' || s === '..')) {
    return Response.json({ error: { message: 'Invalid path' } }, { status: 400 });
  }

  const base = (process.env.API_URL || 'http://localhost:4000').replace(/\/+$/, '');
  const search = new URL(request.url).search;
  const target = `${base}/api/${segments.map(encodeURIComponent).join('/')}${search}`;

  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const init = { method: request.method, headers, cache: 'no-store', redirect: 'manual' };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text();
  }

  let upstream;
  try {
    upstream = await fetch(target, init);
  } catch (err) {
    return Response.json({ error: { message: 'The store backend is not reachable.' } }, { status: 502 });
  }

  const body = NO_BODY_STATUSES.includes(upstream.status) ? null : await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') || 'application/json' },
  });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
