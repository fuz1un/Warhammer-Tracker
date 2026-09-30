const STORAGE_KEY = 'imperial-library:watchlist:v1'

function getBookKey(book) {
  if (!book || typeof book !== 'object') return null

  const identity = book.id || book.slug || book.url || book.title
  return identity ? String(identity).trim() : null
}

function getStorage(storage) {
  if (storage) return storage

  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

export function readWatchlist(storage) {
  try {
    const saved = getStorage(storage)?.getItem(STORAGE_KEY)
    if (!saved) return []

    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed)) return []

    const seen = new Set()
    return parsed.filter((book) => {
      const key = getBookKey(book)
      if (!key || !book.title || seen.has(key)) return false
      seen.add(key)
      return true
    })
  } catch {
    return []
  }
}

export function writeWatchlist(watchlist, storage) {
  try {
    const target = getStorage(storage)
    if (!target) return false
    target.setItem(STORAGE_KEY, JSON.stringify(watchlist))
    return true
  } catch {
    return false
  }
}

export function toggleWatchlist(watchlist, book) {
  const key = getBookKey(book)
  if (!key || !book?.title) return watchlist

  if (watchlist.some((savedBook) => getBookKey(savedBook) === key)) {
    return watchlist.filter((savedBook) => getBookKey(savedBook) !== key)
  }

  return [...watchlist, { ...book }]
}

export function isBookWatched(watchlist, book) {
  const key = getBookKey(book)
  return Boolean(key && watchlist.some((savedBook) => getBookKey(savedBook) === key))
}

export function getWatchlistBooks(watchlist, catalog) {
  const catalogByKey = new Map(
    catalog.map((book) => [getBookKey(book), book]).filter(([key]) => key),
  )

  return watchlist.map((savedBook) => {
    const key = getBookKey(savedBook)
    return catalogByKey.get(key) || savedBook
  })
}
