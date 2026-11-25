import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { serverFetch } from '@/lib/server-api';

export const metadata = { title: 'Shop' };
export const dynamic = 'force-dynamic';

const SORTS = [
  ['newest', 'Newest'],
  ['price_asc', 'Price, low to high'],
  ['price_desc', 'Price, high to low'],
  ['name', 'Name'],
];

function one(value) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

export default async function ProductsPage({ searchParams }) {
  const query = await searchParams;
  const search = one(query.search).trim().slice(0, 100);
  const category = one(query.category).trim().slice(0, 50);
  const sortParam = one(query.sort);
  const sort = SORTS.some(([value]) => value === sortParam) ? sortParam : 'newest';
  const pageNumber = parseInt(one(query.page), 10);
  const page = Number.isInteger(pageNumber) && pageNumber >= 1 ? Math.min(pageNumber, 10000) : 1;

  const apiQuery = new URLSearchParams({ sort, page: String(page), limit: '12' });
  if (search) apiQuery.set('search', search);
  if (category) apiQuery.set('category', category);

  const [data, cats] = await Promise.all([
    serverFetch(`/api/products?${apiQuery.toString()}`),
    serverFetch('/api/products/categories'),
  ]);

  function pageHref(n) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    if (sort !== 'newest') params.set('sort', sort);
    if (n > 1) params.set('page', String(n));
    const qs = params.toString();
    return qs ? `/products?${qs}` : '/products';
  }

  const filtered = Boolean(search || category);

  return (
    <div className="container section">
      <h1 className="page-title">Shop</h1>

      <form className="filters" method="get" action="/products">
        <label className="field-inline grow">
          <span>Search</span>
          <input type="search" name="search" defaultValue={search} maxLength={100} placeholder="Lamp, headphones..." />
        </label>
        <label className="field-inline">
          <span>Category</span>
          <select name="category" defaultValue={category}>
            <option value="">All categories</option>
            {cats.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="field-inline">
          <span>Sort by</span>
          <select name="sort" defaultValue={sort}>
            {SORTS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-primary">
          Apply
        </button>
      </form>

      <p className="result-count" role="status">
        {data.total} {data.total === 1 ? 'product' : 'products'}
        {filtered && (
          <>
            {' '}
            <Link href="/products">Clear filters</Link>
          </>
        )}
      </p>

      {data.items.length === 0 ? (
        <div className="empty-state">
          <h2>No products found</h2>
          <p>Try a different search word, or clear the filters to see everything.</p>
          <Link href="/products" className="btn btn-primary">
            Show all products
          </Link>
        </div>
      ) : (
        <div className="product-grid">
          {data.items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {data.totalPages > 1 && (
        <nav className="pagination" aria-label="Pages">
          {page > 1 ? <Link href={pageHref(page - 1)}>Previous</Link> : <span className="disabled">Previous</span>}
          <span>
            Page {page} of {data.totalPages}
          </span>
          {page < data.totalPages ? (
            <Link href={pageHref(page + 1)}>Next</Link>
          ) : (
            <span className="disabled">Next</span>
          )}
        </nav>
      )}
    </div>
  );
}
