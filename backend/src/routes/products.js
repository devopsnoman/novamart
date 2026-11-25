'use strict';

const express = require('express');
const { z } = require('zod');

const { query } = require('../db');
const { cacheAside, invalidate } = require('../cache');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { slugify, escapeLike } = require('../utils/slugify');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const PRODUCT_COLUMNS =
  'id, name, slug, description, price_cents, stock, category, image_url, is_active, created_at';

function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    priceCents: row.price_cents,
    stock: row.stock,
    category: row.category,
    imageUrl: row.image_url,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

const SORTS = {
  newest: 'created_at DESC, id',
  price_asc: 'price_cents ASC, id',
  price_desc: 'price_cents DESC, id',
  name: 'name ASC, id',
};

const listSchema = z.object({
  category: z.string().trim().min(1).max(50).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'name']).default('newest'),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

const imageUrl = z
  .string()
  .url()
  .max(500)
  .refine((value) => /^https?:\/\//i.test(value), 'imageUrl must start with http:// or https://');

const createSchema = z.object({
  name: z.string().trim().min(1).max(150),
  slug: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(5000).default(''),
  priceCents: z.number().int().min(0).max(100000000),
  stock: z.number().int().min(0).max(1000000).default(0),
  category: z.string().trim().min(1).max(50).default('general'),
  imageUrl: imageUrl.nullable().optional(),
});

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(150),
    description: z.string().trim().max(5000),
    priceCents: z.number().int().min(0).max(100000000),
    stock: z.number().int().min(0).max(1000000),
    category: z.string().trim().min(1).max(50),
    imageUrl: imageUrl.nullable(),
    isActive: z.boolean(),
  })
  .partial()
  .strict();

const PATCH_COLUMNS = {
  name: 'name',
  description: 'description',
  priceCents: 'price_cents',
  stock: 'stock',
  category: 'category',
  imageUrl: 'image_url',
  isActive: 'is_active',
};

// GET /api/products
router.get(
  '/',
  asyncHandler(async (req, res) => {
    // Treat empty query values (?search=) as "not provided".
    const rawQuery = Object.fromEntries(
      Object.entries(req.query).filter(([, value]) => value !== '')
    );
    const { category, search, sort, page, limit } = listSchema.parse(rawQuery);

    const result = await cacheAside(
      'products',
      JSON.stringify({ category, search, sort, page, limit }),
      30,
      async () => {
        const where = ['is_active = TRUE'];
        const params = [];
        if (category) {
          params.push(category);
          where.push(`category = $${params.length}`);
        }
        if (search) {
          params.push(`%${escapeLike(search)}%`);
          where.push(
            `(name ILIKE $${params.length} OR description ILIKE $${params.length})`
          );
        }
        const whereSql = where.join(' AND ');
        const offset = (page - 1) * limit;

        const [itemsRes, countRes] = await Promise.all([
          query(
            `SELECT ${PRODUCT_COLUMNS} FROM products
             WHERE ${whereSql}
             ORDER BY ${SORTS[sort]}
             LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
            [...params, limit, offset]
          ),
          query(`SELECT COUNT(*)::int AS total FROM products WHERE ${whereSql}`, params),
        ]);

        const total = countRes.rows[0].total;
        return {
          items: itemsRes.rows.map(mapProduct),
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        };
      }
    );

    res.json(result);
  })
);

// GET /api/products/categories  (must stay above "/:slug")
router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const categories = await cacheAside('products', 'categories', 60, async () => {
      const { rows } = await query(
        `SELECT DISTINCT category FROM products
         WHERE is_active = TRUE ORDER BY category`
      );
      return rows.map((r) => r.category);
    });
    res.json({ categories });
  })
);

// GET /api/products/:slug  (not cached so stock is always fresh)
router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const slug = z.string().trim().min(1).max(100).parse(req.params.slug);
    const { rows } = await query(
      `SELECT ${PRODUCT_COLUMNS} FROM products WHERE slug = $1 AND is_active = TRUE`,
      [slug]
    );
    if (rows.length === 0) throw new AppError(404, 'Product not found');
    res.json({ product: mapProduct(rows[0]) });
  })
);

// POST /api/products  (admin)
router.post(
  '/',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const slug = slugify(data.slug || data.name);
    if (!slug) throw new AppError(400, 'Could not create a slug from the name');

    let row;
    try {
      const { rows } = await query(
        `INSERT INTO products (name, slug, description, price_cents, stock, category, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING ${PRODUCT_COLUMNS}`,
        [
          data.name,
          slug,
          data.description,
          data.priceCents,
          data.stock,
          data.category,
          data.imageUrl || null,
        ]
      );
      row = rows[0];
    } catch (err) {
      if (err.code === '23505') {
        throw new AppError(409, 'A product with this slug already exists');
      }
      throw err;
    }

    await invalidate('products');
    res.status(201).json({ product: mapProduct(row) });
  })
);

// PATCH /api/products/:id  (admin)
router.patch(
  '/:id',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const data = patchSchema.parse(req.body);

    const entries = Object.entries(data).filter(([, value]) => value !== undefined);
    if (entries.length === 0) {
      throw new AppError(400, 'No fields to update');
    }

    const sets = entries.map(([key], i) => `${PATCH_COLUMNS[key]} = $${i + 1}`);
    const values = entries.map(([, value]) => value);
    values.push(id);

    const { rows } = await query(
      `UPDATE products SET ${sets.join(', ')}
       WHERE id = $${values.length}
       RETURNING ${PRODUCT_COLUMNS}`,
      values
    );
    if (rows.length === 0) throw new AppError(404, 'Product not found');

    await invalidate('products');
    res.json({ product: mapProduct(rows[0]) });
  })
);

module.exports = router;
