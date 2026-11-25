'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useCart } from '@/components/CartProvider';

export default function Header() {
  const { user, ready, logout } = useAuth();
  const { cart } = useCart();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push('/');
  }

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand">
          NovaMart
        </Link>
        <nav className="nav" aria-label="Main">
          <Link href="/products">Shop</Link>
          {user && <Link href="/orders">Orders</Link>}
          <Link href="/cart" className="cart-link">
            Cart
            {cart.itemCount > 0 && (
              <span className="cart-count" aria-label={`${cart.itemCount} items in cart`}>
                {cart.itemCount}
              </span>
            )}
          </Link>
          {ready && !user && (
            <>
              <Link href="/login">Sign in</Link>
              <Link href="/register" className="btn btn-sun btn-small">
                Create account
              </Link>
            </>
          )}
          {ready && user && (
            <>
              <span className="nav-user">{user.name}</span>
              <button type="button" className="nav-button" onClick={handleLogout}>
                Sign out
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
