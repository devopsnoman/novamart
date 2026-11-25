import Link from 'next/link';
import { formatPrice } from '@/lib/format';
import { categoryStyle, productMark } from '@/lib/visuals';

export default function ProductCard({ product }) {
  const soldOut = product.stock === 0;
  const low = product.stock > 0 && product.stock <= 5;

  return (
    <Link href={`/products/${product.slug}`} className="product">
      <div className="product-tile" style={categoryStyle(product.category)}>
        <span className="product-mark" aria-hidden="true">
          {productMark(product.name)}
        </span>
        <span className="price-tag">{formatPrice(product.priceCents)}</span>
      </div>
      <div className="product-info">
        <h3>{product.name}</h3>
        <p className={soldOut || low ? 'product-meta warn' : 'product-meta'}>
          {soldOut ? 'Sold out' : low ? `Only ${product.stock} left` : product.category}
        </p>
      </div>
    </Link>
  );
}
