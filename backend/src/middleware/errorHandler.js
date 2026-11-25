'use strict';

const { ZodError } = require('zod');
const AppError = require('../utils/AppError');
const { fieldErrors } = require('../utils/zodErrors');
const config = require('../config');

function notFound(req, res, next) {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let status = 500;
  let message = 'Internal server error';
  let details;

  if (err instanceof AppError) {
    status = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    status = 400;
    message = 'Validation failed';
    details = fieldErrors(err);
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON body';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Request body too large';
  } else if (err.code === '23505') {
    status = 409; // PostgreSQL unique violation
    message = 'Resource already exists';
  } else if (err.code === '23503') {
    status = 400; // PostgreSQL foreign key violation
    message = 'Related resource does not exist';
  } else if (err.code === '22P02') {
    status = 400; // PostgreSQL invalid text representation (e.g. bad UUID)
    message = 'Invalid identifier format';
  }

  if (status >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err);
  }

  const body = { error: { message } };
  if (details) body.error.details = details;
  if (status >= 500 && !config.isProd) body.error.stack = err.stack;

  return res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
