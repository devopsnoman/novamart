import Link from 'next/link';
import { notFound } from 'next/navigation';
import AddToCart from '@/components/AddToCart';
import { serverFetch } from '@/lib/server-api';
import { formatPrice } from '@/lib/format';
import { categoryStyle, productMark } from '@/lib/visuals';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }) {
  const { slug } = await params;
  let product;
  try {
    const data = await serverFetch(`/api/products/${encodeURIComponent(slug)}`);
    product = data.product;
  } catch (err) {
    if (err.status === 404) notFound();
    throw err;
  }

  const low = product.stock > 0 && product.stock <= 5;

  return (
    <div className="container section">
      <p className="crumbs">
        <Link href="/products">All products</Link>
      </p>
      <div className="detail">
        <div className="detail-tile" style={categoryStyle(product.category)} aria-hidden="true">
          <span>{productMark(product.name)}</span>
        </div>
        <div className="detail-info">
          <p className="detail-category">{product.category}</p>
          <h1>{product.name}</h1>
          <p className="detail-price">{formatPrice(product.priceCents)}</p>
          {product.description && <p className="detail-description">{product.description}</p>}
          {low && <p className="stock-note low">Only {product.stock} left in stock</p>}
          <AddToCart product={{ id: product.id, slug: product.slug, stock: product.stock }} />
        </div>
      </div>
    </div>
  );
}
