'use strict';

const express = require('express');
const { z } = require('zod');

const { query } = require('../db');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const { getCart } = require('../services/cart');

const router = express.Router();
router.use(authenticate);

const quantity = z.coerce.number().int().min(1).max(99);
const productIdParam = z.object({ productId: z.string().uuid() });
const addSchema = z.object({
  productId: z.string().uuid(),
  quantity: quantity.default(1),
});
const updateSchema = z.object({ quantity });

function stockError(product) {
  return product.stock === 0
    ? new AppError(400, `"${product.name}" is out of stock`)
    : new AppError(400, `Only ${product.stock} of "${product.name}" in stock`);
}

async function findActiveProduct(productId) {
  const { rows } = await query(
    'SELECT id, name, stock, is_active FROM products WHERE id = $1',
    [productId]
  );
  if (rows.length === 0 || !rows[0].is_active) {
    throw new AppError(404, 'Product not found');
  }
  return rows[0];
}

// GET /api/cart
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await getCart(req.user.id));
  })
);

// POST /api/cart/items  { productId, quantity }  (adds to existing quantity)
router.post(
  '/items',
  asyncHandler(async (req, res) => {
    const { productId, quantity: qty } = addSchema.parse(req.body);
    const product = await findActiveProduct(productId);

    const { rows } = await query(
      'SELECT quantity FROM cart_items WHERE user_id = $1 AND product_id = $2',
      [req.user.id, productId]
    );
    const newQuantity = Math.min(99, (rows[0] ? rows[0].quantity : 0) + qty);
    if (newQuantity > product.stock) throw stockError(product);

    await query(
      `INSERT INTO cart_items (user_id, product_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = EXCLUDED.quantity`,
      [req.user.id, productId, newQuantity]
    );

    res.status(201).json(await getCart(req.user.id));
  })
);

// PATCH /api/cart/items/:productId  { quantity }  (sets exact quantity)
router.patch(
  '/items/:productId',
  asyncHandler(async (req, res) => {
    const { productId } = productIdParam.parse(req.params);
    const { quantity: qty } = updateSchema.parse(req.body);

    const { rows } = await query(
      'SELECT 1 FROM cart_items WHERE user_id = $1 AND product_id = $2',
      [req.user.id, productId]
    );
    if (rows.length === 0) throw new AppError(404, 'Item not in cart');

    const product = await findActiveProduct(productId);
    if (qty > product.stock) throw stockError(product);

    await query(
      'UPDATE cart_items SET quantity = $1 WHERE user_id = $2 AND product_id = $3',
      [qty, req.user.id, productId]
    );
    res.json(await getCart(req.user.id));
  })
);

// DELETE /api/cart/items/:productId
router.delete(
  '/items/:productId',
  asyncHandler(async (req, res) => {
    const { productId } = productIdParam.parse(req.params);
    await query('DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2', [
      req.user.id,
      productId,
    ]);
    res.json(await getCart(req.user.id));
  })
);

// DELETE /api/cart  (clear everything)
router.delete(
  '/',
  asyncHandler(async (req, res) => {
    await query('DELETE FROM cart_items WHERE user_id = $1', [req.user.id]);
    res.json(await getCart(req.user.id));
  })
);

module.exports = router;
