'use client';

import { AuthProvider } from '@/components/AuthProvider';
import { CartProvider } from '@/components/CartProvider';

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <CartProvider>{children}</CartProvider>
    </AuthProvider>
  );
}
