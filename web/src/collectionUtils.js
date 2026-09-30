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
