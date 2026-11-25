import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { serverFetch } from '@/lib/server-api';
import { categoryStyle } from '@/lib/visuals';

// Data comes from the backend, so never try to pre-render this page at build time.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [products, cats] = await Promise.all([
    serverFetch('/api/products?limit=8&sort=newest'),
    serverFetch('/api/products/categories'),
  ]);

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <h1>Everyday things, sorted.</h1>
            <p>
              Headphones, desk lamps, water bottles and more. Everything listed is in stock, and
              checkout takes about a minute.
            </p>
            <Link href="/products" className="btn btn-sun btn-large">
              Shop all products
            </Link>
          </div>
          {cats.categories.length > 0 && (
            <ul className="category-grid" aria-label="Shop by category">
              {cats.categories.slice(0, 4).map((c) => (
                <li key={c}>
                  <Link
                    href={`/products?category=${encodeURIComponent(c)}`}
                    className="category-tile"
                    style={categoryStyle(c)}
                  >
                    {c}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="container section">
        <div className="section-head">
          <h2>Just in</h2>
          <Link href="/products">See all products</Link>
        </div>
        {products.items.length === 0 ? (
          <p className="empty">No products yet. Run the seed script on the backend to add some.</p>
        ) : (
          <div className="product-grid">
            {products.items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
