const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  normalizeAvailabilityState,
  getTransitionMessage,
  normalizeReleaseDate,
  loadCatalogOverrides,
  normalizeIsbn,
  applyCatalogOverrides,
  sanitizeUrl,
  normalizeCatalogBook,
  buildReleaseSummary,
  isAllowedOrigin,
  redactConfig,
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
  assert.equal(normalizeReleaseDate('2026-02-30'), null);
  assert.equal(normalizeReleaseDate('31 Feb 2026'), null);
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
    author: ['Marc Collins'],
    series: 'Huron Blackheart',
    genre: 'Space Fantasy',
    releaseDate: '20 Oct 2026',
    format: 'Hardback',
    url: '/en-EU/shop/blackheart-claws-of-the-maelstrom',
    description: '<strong>A novel</strong><br><br>More &amp; more.'
  });

  assert.equal(book.series, 'Huron Blackheart');
  assert.equal(book.genre, 'Space Fantasy');
  assert.equal(book.summary, 'A novel\n\nMore & more.');
  assert.equal(book.releaseDate, '2026-10-20');
  assert.equal(book.format, 'hardback');
  assert.equal(book.url, 'https://www.warhammer.com/en-EU/shop/blackheart-claws-of-the-maelstrom');
  assert.equal(book.author, 'Marc Collins');
});

test('preserves every author on co-authored books', () => {
  const book = normalizeCatalogBook({
    title: 'Dawn of Fire: Crusade of Vengeance',
    author: ['Guy Haley', 'Andy Clark', 'Gav Thorpe']
  });

  assert.equal(book.author, 'Guy Haley, Andy Clark, Gav Thorpe');
  assert.deepEqual(book.authors, ['Guy Haley', 'Andy Clark', 'Gav Thorpe']);
});

test('includes flagged new releases without release dates', () => {
  const summary = buildReleaseSummary([
    { id: 'BL-NEW', title: 'New title', series: 'Horus Heresy', isNewRelease: true },
    { id: 'BL-OLD', title: 'Older title', series: 'Horus Heresy', isNewRelease: false },
  ]);

  assert.equal(summary.recent.length, 1);
  assert.equal(summary.recent[0].title, 'New title');
  assert.equal(summary.recent[0].series, 'Horus Heresy');
  assert.equal(summary.upcoming.length, 0);
});

test('loads the versioned metadata override file', () => {
  const filePath = path.join(__dirname, '..', 'catalog-overrides.json');
  const document = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  assert.equal(document.schemaVersion, 1);
  assert.deepEqual(loadCatalogOverrides(), document.records);
});

test('keeps curated author corrections tied to exact store products and source pages', () => {
  const overrides = loadCatalogOverrides();
  const verifiedAuthors = {
    'prod4730130-60100181779': 'Gav Thorpe',
    'prod4650184-60100181776': 'Mike Brooks',
    'prod4370276-60100181735': 'John French',
    'prod2720176-60100181297': 'Ben Counter',
  };

  for (const [id, author] of Object.entries(verifiedAuthors)) {
    assert.deepEqual(overrides[id].authors.value, [author]);
    assert.match(overrides[id].authors.sourceUrl, /^https:\/\/www\.warhammer\.com\//);
    assert.equal(overrides[id].authors.verifiedAt, '2026-09-30');
  }
});

test('applies verified bibliographic overrides without changing store availability or price', () => {
  const book = applyCatalogOverrides({
    id: 'BL-001',
    title: 'Blackheart: Claws of the Maelstrom',
    author: null,
    authors: [],
    series: null,
    releaseDate: null,
    releaseYear: null,
    isbn: null,
    price: '€25.00',
    avail: false,
  }, {
    authors: { value: ['Marc Collins'], sourceUrl: 'https://example.org/book', verifiedAt: '2026-09-30' },
    series: { value: 'Huron Blackheart', sourceUrl: 'https://example.org/series', verifiedAt: '2026-09-30' },
    releaseDate: { value: '19 Sep 2026', sourceUrl: 'https://example.org/release', verifiedAt: '2026-09-30' },
    isbn: { value: '9780553804577', sourceUrl: 'https://example.org/isbn', verifiedAt: '2026-09-30' },
  });

  assert.equal(book.author, 'Marc Collins');
  assert.equal(book.series, 'Huron Blackheart');
  assert.equal(book.releaseDate, '2026-09-19');
  assert.equal(book.releaseYear, '2026');
  assert.equal(book.isbn, '9780553804577');
  assert.equal(book.metadataSources.releaseDate.sourceUrl, 'https://example.org/release');
  assert.equal(book.price, '€25.00');
  assert.equal(book.avail, false);
});

test('rejects overrides with missing provenance, invalid dates, or invalid ISBN checksums', () => {
  const book = applyCatalogOverrides({ id: 'BL-002', author: null, authors: [], releaseDate: null, isbn: null }, {
    authors: { value: ['Unverified Name'], sourceUrl: 'http://example.org/book', verifiedAt: '2026-09-30' },
    releaseDate: { value: '2026-02-30', sourceUrl: 'https://example.org/release', verifiedAt: '2026-09-30' },
    isbn: { value: '9780000000000', sourceUrl: 'https://example.org/isbn', verifiedAt: '2026-09-30' },
  });

  assert.equal(book.author, null);
  assert.equal(book.releaseDate, null);
  assert.equal(book.isbn, null);
  assert.equal(book.metadataSources, undefined);
  assert.equal(normalizeIsbn('0-553-80457-X'), '055380457X');
});

test('allows only trusted origins through the CORS policy', () => {
  assert.equal(isAllowedOrigin('http://localhost:8080'), true);
  assert.equal(isAllowedOrigin('http://127.0.0.1:3000'), true);
  assert.equal(isAllowedOrigin('https://public.example.com'), false);
  assert.equal(isAllowedOrigin(undefined), true);
});

test('redacts secrets before any config is logged', () => {
  const safe = redactConfig({
    algoliaKey: 'super-secret-key-123',
    emailPass: 'password-123',
    discordWebhook: 'https://discord.com/api/webhooks/example/secret'
  });

  assert.notEqual(safe.algoliaKey, 'super-secret-key-123');
  assert.notEqual(safe.emailPass, 'password-123');
  assert.equal(safe.discordWebhook, 'configured');
});
