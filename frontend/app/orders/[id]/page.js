'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { apiFetch, formatError } from '@/lib/api';
import { formatDate, formatPrice } from '@/lib/format';

export default function OrderDetailPage() {
  const params = useParams();
  const id = params.id;
  const { user, ready, token } = useAuth();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [justPlaced, setJustPlaced] = useState(false);

  useEffect(() => {
    setJustPlaced(new URLSearchParams(window.location.search).get('placed') === '1');
  }, []);

  useEffect(() => {
    if (!ready || !user) return undefined;
    let cancelled = false;
    apiFetch(`/orders/${id}`, { token })
      .then((data) => {
        if (!cancelled) setOrder(data.order);
      })
      .catch((err) => {
        if (!cancelled) setError(err.status === 404 ? 'We could not find this order.' : formatError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [ready, user, token, id]);

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
          <h1>Sign in to see this order</h1>
          <Link href={`/login?next=${encodeURIComponent(`/orders/${id}`)}`} className="btn btn-primary">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container section">
      <p className="crumbs">
        <Link href="/orders">All orders</Link>
      </p>
      {justPlaced && order && (
        <div className="banner" role="status">
          Order placed. We have saved it and will keep it as pending.
        </div>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!error && !order && <p>Loading order...</p>}
      {order && (
        <>
          <h1 className="page-title">Order {order.id.slice(0, 8)}</h1>
          <p className="order-sub">
            Placed on {formatDate(order.createdAt)}{' '}
            <span className={`badge badge-${order.status}`}>{order.status}</span>
          </p>
          <div className="cart-layout">
            <ul className="summary-items order-items">
              {order.items.map((item, index) => (
                <li key={`${item.productId || 'removed'}-${index}`}>
                  <span>
                    {item.quantity} x {item.productName}
                    <small>{formatPrice(item.unitPriceCents)} each</small>
                  </span>
                  <span>{formatPrice(item.unitPriceCents * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <aside className="summary">
              <h2>Delivery</h2>
              <p className="address">
                {order.shippingName}
                <br />
                {order.shippingAddress}
              </p>
              <dl>
                <div className="summary-total">
                  <dt>Total</dt>
                  <dd>{formatPrice(order.totalCents)}</dd>
                </div>
              </dl>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
