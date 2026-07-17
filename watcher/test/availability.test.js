const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeAvailabilityState, getTransitionMessage } = require('../server');

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

test('returns distinct transition messages', () => {
  const message = getTransitionMessage(
    { key: 'available', label: 'Available' },
    { key: 'sold-out-online', label: 'Sold out online' }
  );
  assert.equal(message, 'In stock → Sold out online');
});
