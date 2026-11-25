'use strict';

const { query } = require('../db');

/** Returns the user's cart with line totals. */
async function getCart(userId) {
  const { rows } = await query(
    `SELECT p.id AS product_id, p.name, p.slug, p.image_url, p.price_cents,
            p.stock, p.is_active, ci.quantity
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.user_id = $1
     ORDER BY ci.added_at ASC, p.id`,
    [userId]
  );

  const items = rows.map((r) => ({
    productId: r.product_id,
    name: r.name,
    slug: r.slug,
    imageUrl: r.image_url,
    priceCents: r.price_cents,
    stock: r.stock,
    quantity: r.quantity,
    lineTotalCents: r.price_cents * r.quantity,
    // false when the product was disabled or stock fell below the quantity
    available: r.is_active && r.stock >= r.quantity,
  }));

  return {
    items,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    subtotalCents: items.reduce((sum, i) => sum + i.lineTotalCents, 0),
  };
}

module.exports = { getCart };
