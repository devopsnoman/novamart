'use strict';

const { z } = require('zod');

/** Field-level validation messages from a ZodError (works with zod 3 and zod 4). */
function fieldErrors(err) {
  const flat = typeof z.flattenError === 'function' ? z.flattenError(err) : err.flatten();
  return flat.fieldErrors;
}

module.exports = { fieldErrors };
