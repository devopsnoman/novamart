'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useCart } from '@/components/CartProvider';
import { apiFetch, formatError } from '@/lib/api';
import { formatPrice } from '@/lib/format';

export default function CheckoutPage() {
  const router = useRouter();
  const { user, ready, token } = useAuth();
  const { cart, loading, refresh } = useCart();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) setName((current) => current || user.name);
  }, [user]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await apiFetch('/orders', {
        method: 'POST',
        token,
        body: { shippingName: name, shippingAddress: address },
      });
      await refresh();
      router.push(`/orders/${data.order.id}?placed=1`);
    } catch (err) {
      setError(formatError(err));
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <div className="container section">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container section">
        <div className="empty-state">
          <h1>Sign in to check out</h1>
          <Link href="/login?next=%2Fcheckout" className="btn btn-primary">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="container section">
        <div className="empty-state">
          <h1>{loading ? 'Loading your cart...' : 'Nothing to check out'}</h1>
          {!loading && (
            <>
              <p>Your cart is empty.</p>
              <Link href="/products" className="btn btn-primary">
                Browse products
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  const hasUnavailable = cart.items.some((item) => !item.available);

  return (
    <div className="container section">
      <h1 className="page-title">Checkout</h1>
      <div className="cart-layout">
        <form className="form-card" onSubmit={handleSubmit}>
          <h2>Delivery details</h2>
          <label className="field">
            <span>Full name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              autoComplete="name"
            />
          </label>
          <label className="field">
            <span>Address</span>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              minLength={5}
              maxLength={300}
              rows={4}
              autoComplete="street-address"
            />
          </label>
          <p className="hint">
            This is a demo store: no payment is taken and nothing is shipped. Your order is saved as
            pending.
          </p>
          {hasUnavailable && (
            <p className="form-error" role="alert">
              Some items are no longer available. <Link href="/cart">Fix your cart</Link>
            </p>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error} <Link href="/cart">Review cart</Link>
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={submitting || hasUnavailable}>
            {submitting ? 'Placing order...' : 'Place order'}
          </button>
        </form>

        <aside className="summary">
          <h2>Your items</h2>
          <ul className="summary-items">
            {cart.items.map((item) => (
              <li key={item.productId}>
                <span>
                  {item.quantity} x {item.name}
                </span>
                <span>{formatPrice(item.lineTotalCents)}</span>
              </li>
            ))}
          </ul>
          <dl>
            <div className="summary-total">
              <dt>Total</dt>
              <dd>{formatPrice(cart.subtotalCents)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
