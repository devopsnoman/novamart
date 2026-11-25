'use strict';

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

/** Escape % and _ so user input is matched literally in ILIKE. */
function escapeLike(text) {
  return String(text).replace(/[\\%_]/g, '\\$&');
}

module.exports = { slugify, escapeLike };
