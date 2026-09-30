import test from 'node:test'
import assert from 'node:assert/strict'
import { filterBooksByCollection, getCollectionSummary } from './collectionUtils.js'

test('matches books by author and series collection', () => {
  const books = [
    { title: 'Book One', author: 'Jane Doe', series: 'The Long War' },
    { title: 'Book Two', author: 'John Smith', series: 'The Long War' },
    { title: 'Book Three', author: 'Jane Doe', series: 'The Silent Tide' },
  ]

  assert.deepEqual(filterBooksByCollection('author', 'Jane Doe', books).map((book) => book.title), ['Book One', 'Book Three'])
  assert.deepEqual(filterBooksByCollection('series', 'The Long War', books).map((book) => book.title), ['Book One', 'Book Two'])
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
