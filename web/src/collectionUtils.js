export function filterBooksByCollection(collectionType, collectionValue, books) {
  if (!Array.isArray(books)) return []

  const value = String(collectionValue || '').trim()
  if (!value || value === 'all') {
    return books
  }

  return books.filter((book) => {
    if (collectionType === 'author') {
      const author = String(book.author || book.authors?.join(', ') || '').trim()
      return author === value
    }

    if (collectionType === 'series') {
      const series = String(book.series || '').trim()
      return series === value
    }

    return true
  })
}

export function filterBooksByStatus(statusFilter, books) {
  if (!Array.isArray(books)) return []

  const value = String(statusFilter || 'all').trim().toLowerCase()
  if (!value || value === 'all') {
    return books
  }

  if (value === 'available') {
    return books.filter((book) => String(book.availabilityState || '').trim() === 'available')
  }

  if (value === 'preorder') {
    return books.filter((book) => String(book.availabilityState || '').trim() === 'preorder')
  }

  if (value === 'unavailable') {
    return books.filter((book) => ['sold-out-online', 'temporarily-out-of-stock'].includes(String(book.availabilityState || '').trim()))
  }

  return books
}

export function paginateBooks(books, pageSize = 24, page = 1) {
  if (!Array.isArray(books)) return []

  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 24
  const safePage = Number.isFinite(page) && page > 0 ? page : 1
  const start = (safePage - 1) * safePageSize

  return books.slice(start, start + safePageSize)
}

export function getCollectionSummary(collectionType, collectionValue, totalItems = 0) {
  const safeType = collectionType === 'author' ? 'author' : collectionType === 'series' ? 'series' : 'collection'
  const safeValue = String(collectionValue || '').trim()
  const label = safeType === 'author' ? 'Author collection' : safeType === 'series' ? 'Series collection' : 'Collection'

  return {
    type: safeType,
    name: safeValue || 'All titles',
    label,
    count: Number.isFinite(totalItems) ? totalItems : 0,
    title: safeValue ? `${label}: ${safeValue}` : label,
  }
}

export function getProvenanceBadges(book = {}) {
  const badges = []
  const sourceType = String(book.sourceType || 'official').trim().toLowerCase()

  if (sourceType === 'curated-archive' || sourceType === 'archive' || sourceType === 'historical') {
    badges.push({ label: 'Archive record', tone: 'muted' })
  } else {
    badges.push({ label: 'Official stock', tone: 'gold' })
  }

  if (book.metadataSources && Object.keys(book.metadataSources).length > 0) {
    badges.push({ label: 'Metadata verified', tone: 'blue' })
  }

  if (book.isNewRelease) {
    badges.push({ label: 'New release', tone: 'green' })
  }

  return badges
}

export function getStockHistoryStatusLabel(entry = {}) {
  const labels = {
    available: 'Available',
    preorder: 'Pre-order',
    'sold-out-online': 'Sold out online',
    'temporarily-out-of-stock': 'Temporarily out of stock',
  }

  return labels[entry.availabilityState] || 'Unknown'
}
