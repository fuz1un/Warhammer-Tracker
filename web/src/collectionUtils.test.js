import test from 'node:test'
import assert from 'node:assert/strict'
import { filterBooksByCollection, filterBooksByStatus, getCollectionSummary, paginateBooks } from './collectionUtils.js'

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
