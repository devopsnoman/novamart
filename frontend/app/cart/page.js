'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useCart } from '@/components/CartProvider';
import { formatError } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import { categoryStyle, productMark } from '@/lib/visuals';

export default function CartPage() {
  const { user, ready } = useAuth();
  const { cart, loading, setQuantity, removeItem } = useCart();
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  async function act(productId, action) {
    setBusyId(productId);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setBusyId('');
    }
  }

  if (!ready) {
    return (
      <div className="container section">
        <p>Loading your cart...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container section">
        <div className="empty-state">
          <h1>Sign in to see your cart</h1>
          <p>Your cart is saved to your account, so you can pick it up on any device.</p>
          <Link href="/login?next=%2Fcart" className="btn btn-primary">
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
          <h1>{loading ? 'Loading your cart...' : 'Your cart is empty'}</h1>
          {!loading && (
            <>
              <p>Add something you like and it will show up here.</p>
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
      <h1 className="page-title">Your cart</h1>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="cart-layout">
        <ul className="cart-list">
          {cart.items.map((item) => {
            const busy = busyId === item.productId;
            const maxQty = Math.min(item.stock, 99);
            return (
              <li key={item.productId} className="cart-row">
                <div className="cart-tile" style={categoryStyle()} aria-hidden="true">
                  {productMark(item.name)}
                </div>
                <div className="cart-main">
                  <Link href={`/products/${item.slug}`} className="cart-name">
                    {item.name}
                  </Link>
                  <p className="cart-each">{formatPrice(item.priceCents)} each</p>
                  {!item.available && (
                    <p className="form-error">
                      Not available in this quantity. Lower the quantity or remove it.
                    </p>
                  )}
                  <div className="stepper">
                    <button
                      type="button"
                      aria-label={`Decrease quantity of ${item.name}`}
                      disabled={busy || item.quantity <= 1}
                      onClick={() => act(item.productId, () => setQuantity(item.productId, item.quantity - 1))}
                    >
                      -
                    </button>
                    <span aria-live="polite">{item.quantity}</span>
                    <button
                      type="button"
                      aria-label={`Increase quantity of ${item.name}`}
                      disabled={busy || item.quantity >= maxQty}
                      onClick={() => act(item.productId, () => setQuantity(item.productId, item.quantity + 1))}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="link-button"
                      disabled={busy}
                      onClick={() => act(item.productId, () => removeItem(item.productId))}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <p className="cart-line-total">{formatPrice(item.lineTotalCents)}</p>
              </li>
            );
          })}
        </ul>

        <aside className="summary">
          <h2>Order summary</h2>
          <dl>
            <div>
              <dt>Items</dt>
              <dd>{cart.itemCount}</dd>
            </div>
            <div className="summary-total">
              <dt>Subtotal</dt>
              <dd>{formatPrice(cart.subtotalCents)}</dd>
            </div>
          </dl>
          {hasUnavailable ? (
            <button type="button" className="btn btn-primary btn-block" disabled>
              Fix cart to continue
            </button>
          ) : (
            <Link href="/checkout" className="btn btn-primary btn-block">
              Go to checkout
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
