import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container section">
      <div className="empty-state">
        <h1>Page not found</h1>
        <p>The page you are looking for does not exist or was removed.</p>
        <Link href="/products" className="btn btn-primary">
          Browse products
        </Link>
      </div>
    </div>
  );
}
