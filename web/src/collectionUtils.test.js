import test from 'node:test'
import assert from 'node:assert/strict'
import {
  filterBooksByCollection,
  filterBooksByStatus,
  getCollectionSummary,
  getProvenanceBadges,
  getStockHistoryStatusLabel,
  paginateBooks,
} from './collectionUtils.js'

test('matches books by author and series collection', () => {
  const books = [
    { title: 'Book One', author: 'Jane Doe', series: 'The Long War' },
    { title: 'Book Two', author: 'John Smith', series: 'The Long War' },
    { title: 'Book Three', author: 'Jane Doe', series: 'The Silent Tide' },
  ]

  assert.deepEqual(filterBooksByCollection('author', 'Jane Doe', books).map((book) => book.title), ['Book One', 'Book Three'])
  assert.deepEqual(filterBooksByCollection('series', 'The Long War', books).map((book) => book.title), ['Book One', 'Book Two'])
})

test('filters books by stock state for a richer frontend catalog view', () => {
  const books = [
    { title: 'In stock', availabilityState: 'available' },
    { title: 'Preorder now', availabilityState: 'preorder' },
    { title: 'Sold out', availabilityState: 'sold-out-online' },
    { title: 'Temporarily unavailable', availabilityState: 'temporarily-out-of-stock' },
  ]

  assert.deepEqual(filterBooksByStatus('available', books).map((book) => book.title), ['In stock'])
  assert.deepEqual(filterBooksByStatus('preorder', books).map((book) => book.title), ['Preorder now'])
  assert.deepEqual(filterBooksByStatus('unavailable', books).map((book) => book.title), ['Sold out', 'Temporarily unavailable'])
  assert.deepEqual(filterBooksByStatus('all', books).length, books.length)
})

test('paginates the catalog in predictable chunks for incremental loading', () => {
  const books = Array.from({ length: 10 }, (_, index) => ({ title: `Book ${index + 1}` }))

  assert.deepEqual(paginateBooks(books, 4, 1).map((book) => book.title), ['Book 1', 'Book 2', 'Book 3', 'Book 4'])
  assert.deepEqual(paginateBooks(books, 4, 2).map((book) => book.title), ['Book 5', 'Book 6', 'Book 7', 'Book 8'])
  assert.deepEqual(paginateBooks(books, 4, 3).map((book) => book.title), ['Book 9', 'Book 10'])
  assert.deepEqual(paginateBooks([], 4, 1), [])
})

test('builds readable collection headers and labels', () => {
  const summary = getCollectionSummary('author', 'Jane Doe', 2)
  assert.equal(summary.label, 'Author collection')
  assert.equal(summary.name, 'Jane Doe')
  assert.equal(summary.title, 'Author collection: Jane Doe')

  const seriesSummary = getCollectionSummary('series', 'The Long War', 3)
  assert.equal(seriesSummary.label, 'Series collection')
  assert.equal(seriesSummary.title, 'Series collection: The Long War')
})

test('builds provenance badges and labels official stock history states', () => {
  const officialBook = {
    title: 'The Long War',
    sourceType: 'official',
    availabilityState: 'preorder',
    availabilityLabel: 'Pre-order',
    availabilityMessage: 'Official stock is currently pre-order only.',
    metadataSources: {
      releaseDate: { sourceUrl: 'https://example.com/release', verifiedAt: '2026-09-19' },
    },
  }

  const archiveBook = {
    title: 'Warhammer 40,000',
    sourceType: 'curated-archive',
    availabilityState: 'sold-out-online',
    availabilityLabel: 'Sold out online',
    availabilityMessage: 'Archived recording, not live official stock.',
  }

  const officialBadges = getProvenanceBadges(officialBook)
  assert.deepEqual(officialBadges.map((badge) => badge.label), ['Official stock', 'Metadata verified'])

  const archiveBadges = getProvenanceBadges(archiveBook)
  assert.deepEqual(archiveBadges.map((badge) => badge.label), ['Archive record'])

  assert.equal(getStockHistoryStatusLabel({ availabilityState: 'preorder' }), 'Pre-order')
  assert.equal(getStockHistoryStatusLabel({ availabilityState: 'sold-out-online' }), 'Sold out online')
  assert.equal(getStockHistoryStatusLabel({ availabilityState: 'temporarily-out-of-stock' }), 'Temporarily out of stock')
  assert.equal(getStockHistoryStatusLabel({ availabilityState: 'unrecognized' }), 'Unknown')
})
