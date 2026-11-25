'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { slugify, escapeLike } = require('../src/utils/slugify');

test('slugify makes URL-safe lowercase slugs', () => {
  assert.equal(slugify('  Wireless Headphones Pro! '), 'wireless-headphones-pro');
  assert.equal(slugify('Café Latte Mug'), 'cafe-latte-mug');
  assert.equal(slugify('A  --  B'), 'a-b');
});

test('slugify returns empty string when nothing usable is left', () => {
  assert.equal(slugify('!!!'), '');
});

test('slugify caps length at 80 and never ends with a dash', () => {
  const slug = slugify(`${'a'.repeat(79)} bbb`);
  assert.ok(slug.length <= 80);
  assert.ok(!slug.endsWith('-'));
});

test('escapeLike escapes %, _ and backslash', () => {
  assert.equal(escapeLike('50%_off\\'), '50\\%\\_off\\\\');
  assert.equal(escapeLike('plain'), 'plain');
});
