'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useCart } from '@/components/CartProvider';
import { formatError } from '@/lib/api';

export default function AddToCart({ product }) {
  const { user, ready } = useAuth();
  const { addItem } = useCart();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [state, setState] = useState({ status: 'idle', message: '' });

  if (product.stock === 0) {
    return <p className="stock-note out">Sold out</p>;
  }

  const max = Math.min(product.stock, 10);
  const options = Array.from({ length: max }, (_, i) => i + 1);

  async function handleAdd() {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/products/${product.slug}`)}`);
      return;
    }
    setState({ status: 'loading', message: '' });
    try {
      await addItem(product.id, quantity);
      setState({ status: 'added', message: '' });
    } catch (err) {
      setState({ status: 'error', message: formatError(err) });
    }
  }

  return (
    <div className="add-to-cart">
      <div className="add-row">
        <label className="field-inline">
          <span>Quantity</span>
          <select value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}>
            {options.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleAdd}
          disabled={!ready || state.status === 'loading'}
        >
          {state.status === 'loading' ? 'Adding...' : 'Add to cart'}
        </button>
      </div>
      {!user && ready && <p className="hint">You will be asked to sign in first.</p>}
      {state.status === 'added' && (
        <p className="success" role="status">
          Added to your cart. <Link href="/cart">View cart</Link>
        </p>
      )}
      {state.status === 'error' && (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      )}
    </div>
  );
}
