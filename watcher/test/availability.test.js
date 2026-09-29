const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeAvailabilityState,
  getTransitionMessage,
  normalizeReleaseDate,
  sanitizeUrl,
  normalizeCatalogBook,
} = require('../server');

test('detects sold out online variants', () => {
  const state = normalizeAvailabilityState({ availability: 'Sold out online' });
  assert.equal(state.key, 'sold-out-online');
  assert.equal(state.label, 'Sold out online');
  assert.equal(state.soldOut, true);
});

test('detects temporarily out of stock variants', () => {
  const state = normalizeAvailabilityState({ availability: 'Temporarily out of stock' });
  assert.equal(state.key, 'temporarily-out-of-stock');
  assert.equal(state.label, 'Temporarily out of stock');
});

test('classifies out-of-stock items with stock flags as sold out', () => {
  const state = normalizeAvailabilityState({
    isPreOrder: false,
    isAvailable: true,
    isInStock: false,
    availability: 'Pre-order'
  });
  assert.equal(state.key, 'sold-out-online');
  assert.equal(state.label, 'Sold out online');
});

test('returns distinct transition messages', () => {
  const message = getTransitionMessage(
    { key: 'available', label: 'Available' },
    { key: 'sold-out-online', label: 'Sold out online' }
  );
  assert.equal(message, 'In stock → Sold out online');
});

test('normalizes release dates from common BL formats', () => {
  assert.equal(normalizeReleaseDate('20 Oct 2026'), '2026-10-20');
  assert.equal(normalizeReleaseDate('2026'), '2026');
  assert.equal(normalizeReleaseDate('TBA'), null);
  assert.equal(normalizeReleaseDate('Not yet released'), null);
});

test('sanitizes external URLs and blocks javascript payloads', () => {
  assert.equal(sanitizeUrl('javascript:alert(1)'), null);
  assert.equal(sanitizeUrl('/en-EU/shop/test-book'), 'https://www.warhammer.com/en-EU/shop/test-book');
  assert.equal(sanitizeUrl('https://example.com/book?a=1'), 'https://example.com/book?a=1');
});

test('adds richer catalog metadata for release browsing', () => {
  const book = normalizeCatalogBook({
    id: 'BL-001',
    title: 'Blackheart: Claws of the Maelstrom',
    author: 'Marc Collins',
    range: 'Huron Blackheart',
    releaseDate: '20 Oct 2026',
    format: 'Hardback',
    url: '/en-EU/shop/blackheart-claws-of-the-maelstrom',
    availabilityState: 'available'
  });

  assert.equal(book.series, 'Huron Blackheart');
  assert.equal(book.releaseDate, '2026-10-20');
  assert.equal(book.format, 'hardback');
  assert.equal(book.url, 'https://www.warhammer.com/en-EU/shop/blackheart-claws-of-the-maelstrom');
  assert.equal(book.availabilityState, 'available');
});
