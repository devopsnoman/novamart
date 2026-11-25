'use strict';

// End-to-end API check. Usage: npm run smoke   (API must be running, DB seeded)
const BASE = process.env.API_URL || 'http://localhost:4000';
let failures = 0;

function check(name, condition, extra) {
  if (condition) {
    console.log(`  PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${name}`, extra !== undefined ? JSON.stringify(extra) : '');
  }
}

async function call(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    /* no body */
  }
  return { status: res.status, data };
}

async function main() {
  console.log(`Smoke test against ${BASE}\n`);
  const email = `smoke+${Date.now()}@example.com`;
  const password = 'Sup3rSecret!';

  let r = await call('GET', '/api/health');
  check('health is ok', r.status === 200 && r.data.status === 'ok', r);

  r = await call('GET', '/api/products?limit=50');
  check('products list has items (did you run npm run seed?)', r.status === 200 && r.data.items.length > 0, r);
  const product = r.data.items.find((p) => p.stock >= 3);
  check('found a product with stock >= 3', !!product);
  if (!product) throw new Error('Cannot continue without a product');

  r = await call('GET', `/api/products/${product.slug}`);
  check('product detail by slug', r.status === 200 && r.data.product.id === product.id, r);

  r = await call('GET', '/api/products/does-not-exist');
  check('unknown product gives 404', r.status === 404, r);

  r = await call('POST', '/api/auth/register', { name: 'Smoke Tester', email, password: 'short' });
  check('register with short password gives 400', r.status === 400, r);

  r = await call('POST', '/api/auth/register', { name: 'Smoke Tester', email, password });
  check('register works', r.status === 201 && !!r.data.token, r);
  const token = r.data.token;

  r = await call('POST', '/api/auth/register', { name: 'Smoke Tester', email, password });
  check('duplicate register gives 409', r.status === 409, r);

  r = await call('POST', '/api/auth/login', { email, password: 'wrong-password' });
  check('wrong password gives 401', r.status === 401, r);

  r = await call('POST', '/api/auth/login', { email, password });
  check('login works', r.status === 200 && !!r.data.token, r);

  r = await call('GET', '/api/auth/me', undefined, token);
  check('/me returns the user', r.status === 200 && r.data.user.email === email, r);

  r = await call('GET', '/api/cart');
  check('cart without token gives 401', r.status === 401, r);

  r = await call('POST', '/api/cart/items', { productId: 'not-a-uuid', quantity: 1 }, token);
  check('invalid product id gives 400', r.status === 400, r);

  r = await call('POST', '/api/cart/items', { productId: product.id, quantity: 2 }, token);
  check('add to cart', r.status === 201 && r.data.items.length === 1 && r.data.itemCount === 2, r);

  r = await call('POST', '/api/cart/items', { productId: product.id, quantity: product.stock + 1 }, token);
  check('adding more than stock gives 400', r.status === 400, r);

  r = await call('PATCH', `/api/cart/items/${product.id}`, { quantity: 3 }, token);
  check('update quantity', r.status === 200 && r.data.itemCount === 3 && r.data.subtotalCents === product.priceCents * 3, r);

  r = await call('POST', '/api/orders', { shippingName: 'Smoke Tester', shippingAddress: '' }, token);
  check('order with empty address gives 400', r.status === 400, r);

  r = await call('POST', '/api/orders', { shippingName: 'Smoke Tester', shippingAddress: '12 Test Street, Lahore' }, token);
  check('place order', r.status === 201 && r.data.order.totalCents === product.priceCents * 3, r);
  const orderId = r.data.order && r.data.order.id;

  r = await call('GET', '/api/cart', undefined, token);
  check('cart is empty after order', r.status === 200 && r.data.items.length === 0, r);

  r = await call('POST', '/api/orders', { shippingName: 'Smoke Tester', shippingAddress: '12 Test Street, Lahore' }, token);
  check('ordering with empty cart gives 400', r.status === 400, r);

  r = await call('GET', '/api/orders', undefined, token);
  check('order list has 1 order', r.status === 200 && r.data.orders.length === 1, r);

  r = await call('GET', `/api/orders/${orderId}`, undefined, token);
  check('order detail has items', r.status === 200 && r.data.order.items.length === 1, r);

  r = await call('GET', `/api/products/${product.slug}`);
  check('stock reduced by 3', r.status === 200 && r.data.product.stock === product.stock - 3, r);

  r = await call('POST', '/api/products', { name: 'Hack', priceCents: 1 }, token);
  check('normal user cannot create products (403)', r.status === 403, r);

  console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Smoke test crashed:', err.message);
  process.exit(1);
});
