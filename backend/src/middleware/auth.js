'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');
const { query } = require('../db');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/** Requires "Authorization: Bearer <token>" and loads the user from the database. */
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'Authentication required');
  }

  let payload;
  try {
    payload = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    throw new AppError(401, 'Invalid or expired token');
  }

  const { rows } = await query(
    'SELECT id, email, name, role FROM users WHERE id = $1',
    [payload.sub]
  );
  if (rows.length === 0) {
    throw new AppError(401, 'Invalid or expired token');
  }

  req.user = rows[0];
  next();
});

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return next(new AppError(403, 'Admin access required'));
  }
  return next();
}

module.exports = { authenticate, requireAdmin };
