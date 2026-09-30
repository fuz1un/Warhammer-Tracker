import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getWatchlistBooks,
  isBookWatched,
  readWatchlist,
  toggleWatchlist,
  writeWatchlist,
} from './watchlist.js'

function createStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
}

test('toggles books by stable catalog identity and persists them', () => {
  const storage = createStorage()
  const book = { id: 'book-1', title: 'The First Book', availabilityState: 'available' }
  const next = toggleWatchlist([], book)

  assert.equal(next.length, 1)
  assert.equal(isBookWatched(next, { id: 'book-1', title: 'Updated title' }), true)
  assert.equal(writeWatchlist(next, storage), true)
  assert.deepEqual(readWatchlist(storage), next)

  const removed = toggleWatchlist(next, book)
  assert.deepEqual(removed, [])
})

test('uses saved book snapshots when the current catalog no longer contains a title', () => {
  const watched = [
    { id: 'book-1', title: 'Saved title', availabilityState: 'sold-out-online' },
    { id: 'book-2', title: 'Current title', availabilityState: 'available' },
  ]
  const currentCatalog = [{ id: 'book-2', title: 'Current title', availabilityState: 'preorder' }]

  assert.deepEqual(getWatchlistBooks(watched, currentCatalog), [
    watched[0],
    currentCatalog[0],
  ])
})

test('ignores invalid stored data and duplicate entries', () => {
  const storage = createStorage()
  storage.setItem('imperial-library:watchlist:v1', JSON.stringify([
    { id: 'book-1', title: 'First title' },
    { id: 'book-1', title: 'Duplicate title' },
    null,
    { id: 'book-2' },
  ]))

  assert.deepEqual(readWatchlist(storage), [{ id: 'book-1', title: 'First title' }])

  storage.setItem('imperial-library:watchlist:v1', '{bad json')
  assert.deepEqual(readWatchlist(storage), [])
})
