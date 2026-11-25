'use strict';

const express = require('express');
const { z } = require('zod');

const { query, withTransaction } = require('../db');
const { invalidate } = require('../cache');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const createSchema = z.object({
  shippingName: z.string().trim().min(1).max(100),
  shippingAddress: z.string().trim().min(5).max(300),
});

function mapOrder(row, items) {
  const order = {
    id: row.id,
    status: row.status,
    totalCents: row.total_cents,
    shippingName: row.shipping_name,
    shippingAddress: row.shipping_address,
    createdAt: row.created_at,
  };
  if (row.item_count !== undefined) order.itemCount = row.item_count;
  if (items) {
    order.items = items.map((i) => ({
      productId: i.product_id,
      productName: i.product_name,
      unitPriceCents: i.unit_price_cents,
      quantity: i.quantity,
    }));
  }
  return order;
}

async function loadOrderItems(orderId) {
  const { rows } = await query(
    `SELECT product_id, product_name, unit_price_cents, quantity
     FROM order_items WHERE order_id = $1 ORDER BY product_name`,
    [orderId]
  );
  return rows;
}

// POST /api/orders  -> turns the cart into an order (payment is out of scope)
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);

    const order = await withTransaction(async (client) => {
      // Lock the product rows (in a fixed order) so two checkouts cannot oversell stock.
      const { rows: lines } = await client.query(
        `SELECT ci.product_id, ci.quantity, p.name, p.price_cents, p.stock, p.is_active
         FROM cart_items ci
         JOIN products p ON p.id = ci.product_id
         WHERE ci.user_id = $1
         ORDER BY p.id
         FOR UPDATE OF p`,
        [req.user.id]
      );

      if (lines.length === 0) throw new AppError(400, 'Your cart is empty');

      for (const line of lines) {
        if (!line.is_active) {
          throw new AppError(409, `"${line.name}" is no longer available. Remove it from your cart.`);
        }
        if (line.stock < line.quantity) {
          throw new AppError(
            409,
            line.stock === 0
              ? `"${line.name}" is out of stock. Remove it from your cart.`
              : `Only ${line.stock} of "${line.name}" in stock. Lower the quantity.`
          );
        }
      }

      const totalCents = lines.reduce((sum, l) => sum + l.price_cents * l.quantity, 0);

      const { rows } = await client.query(
        `INSERT INTO orders (user_id, total_cents, shipping_name, shipping_address)
         VALUES ($1, $2, $3, $4)
         RETURNING id, status, total_cents, shipping_name, shipping_address, created_at`,
        [req.user.id, totalCents, data.shippingName, data.shippingAddress]
      );
      const created = rows[0];

      for (const line of lines) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name, unit_price_cents, quantity)
           VALUES ($1, $2, $3, $4, $5)`,
          [created.id, line.product_id, line.name, line.price_cents, line.quantity]
        );
        const upd = await client.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1',
          [line.quantity, line.product_id]
        );
        if (upd.rowCount !== 1) {
          throw new AppError(409, `"${line.name}" just went out of stock`);
        }
      }

      await client.query('DELETE FROM cart_items WHERE user_id = $1', [req.user.id]);

      return mapOrder(
        created,
        lines.map((l) => ({
          product_id: l.product_id,
          product_name: l.name,
          unit_price_cents: l.price_cents,
          quantity: l.quantity,
        }))
      );
    });

    await invalidate('products'); // stock changed
    res.status(201).json({ order });
  })
);

// GET /api/orders  -> my orders (latest 50)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT o.id, o.status, o.total_cents, o.shipping_name, o.shipping_address, o.created_at,
              COALESCE((SELECT SUM(quantity) FROM order_items WHERE order_id = o.id), 0)::int AS item_count
       FROM orders o
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json({ orders: rows.map((r) => mapOrder(r)) });
  })
);

// GET /api/orders/:id  -> one of my orders (admins can view any)
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const { rows } = await query(
      `SELECT id, user_id, status, total_cents, shipping_name, shipping_address, created_at
       FROM orders WHERE id = $1`,
      [id]
    );
    const row = rows[0];
    if (!row || (row.user_id !== req.user.id && req.user.role !== 'admin')) {
      throw new AppError(404, 'Order not found');
    }
    res.json({ order: mapOrder(row, await loadOrderItems(id)) });
  })
);

module.exports = router;
