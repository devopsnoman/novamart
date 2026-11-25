'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { apiFetch, formatError } from '@/lib/api';
import { formatDate, formatPrice } from '@/lib/format';

export default function OrdersPage() {
  const { user, ready, token } = useAuth();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ready || !user) return undefined;
    let cancelled = false;
    apiFetch('/orders', { token })
      .then((data) => {
        if (!cancelled) setOrders(data.orders);
      })
      .catch((err) => {
        if (!cancelled) setError(formatError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [ready, user, token]);

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
          <h1>Sign in to see your orders</h1>
          <Link href="/login?next=%2Forders" className="btn btn-primary">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container section">
      <h1 className="page-title">Your orders</h1>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!error && orders === null && <p>Loading your orders...</p>}
      {orders && orders.length === 0 && (
        <div className="empty-state">
          <h2>No orders yet</h2>
          <p>When you place an order it will show up here.</p>
          <Link href="/products" className="btn btn-primary">
            Start shopping
          </Link>
        </div>
      )}
      {orders && orders.length > 0 && (
        <ul className="order-list">
          {orders.map((order) => (
            <li key={order.id}>
              <Link href={`/orders/${order.id}`} className="order-row">
                <span className="order-date">{formatDate(order.createdAt)}</span>
                <span className="order-id">Order {order.id.slice(0, 8)}</span>
                <span>
                  {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                </span>
                <span className={`badge badge-${order.status}`}>{order.status}</span>
                <strong>{formatPrice(order.totalCents)}</strong>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
