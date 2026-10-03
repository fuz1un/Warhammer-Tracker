import { useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  filterBooksByCollection,
  filterBooksByStatus,
  getCollectionSummary,
  getProvenanceBadges,
  getStockHistoryStatusLabel,
  paginateBooks,
} from './collectionUtils.js'
import {
  getWatchlistBooks,
  isBookWatched,
  readWatchlist,
  toggleWatchlist as toggleBookInWatchlist,
  writeWatchlist,
} from './watchlist.js'

const pillars = [
  {
    title: 'Official stock first',
    text: 'Use Black Library as the source of truth for active availability, preorder activity and price signals.',
  },
  {
    title: 'Secondary market visibility',
    text: 'When an older title is no longer sold in the official shop, mark it clearly as historical or reseller-based data.',
  },
  {
    title: 'Editorial metadata layer',
    text: 'Add authors, series, release chronology, reading order, source provenance and cross-edition context.',
  },
]

const roadmap = [
  'Web app stable and reliable',
  'Catalog enrichment and trust layer',
  'User auth and multi-user watchlists',
  'PWA installable experience',
  'Purchase assistance and restock automation',
]

const stack = [
  'Node.js backend',
  'React + Vite frontend',
  'Source-tagged metadata',
  'Provenance-first product model',
  'User library and alerts',
  'Future checkout assistance',
]

const tabs = [
  { key: 'all', label: 'All titles' },
  { key: 'preorder', label: 'Pre-orders' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'archive', label: 'Archive editions' },
]

async function fetchJson(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }
  return response.json()
}

function resolveBookUrl(url) {
  if (!url) return '#'

  if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url)
      const path = parsed.pathname.replace(/^\/+/, '')
      if ((parsed.hostname === 'warhammer.com' || parsed.hostname === 'www.warhammer.com') && !path.includes('/shop/')) {
        return `https://www.warhammer.com/en-EU/shop/${path}`
      }
      return url
    } catch {
      return '#'
    }
  }

  if (url.startsWith('/')) return `https://www.warhammer.com${url}`
  if (url.includes('/shop/')) return `https://www.warhammer.com/${url}`
  return `https://www.warhammer.com/en-EU/shop/${url.replace(/^\/+/, '')}`
}

function formatMonthLabel(monthKey) {
  if (!monthKey || monthKey === 'unknown') return 'Upcoming'

  const safeDate = `${monthKey}-01T00:00:00`
  const date = new Date(safeDate)

  if (Number.isNaN(date.getTime())) return monthKey

  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date)
}

function App() {
  const [health, setHealth] = useState(null)
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('all')
  const [searchMode, setSearchMode] = useState('title')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAuthor, setSelectedAuthor] = useState('all')
  const [selectedSeries, setSelectedSeries] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('title')
  const [pageSize] = useState(24)
  const [visibleCount, setVisibleCount] = useState(24)
  const [releaseSummary, setReleaseSummary] = useState(null)
  const [selectedBook, setSelectedBook] = useState(null)
  const [stockHistoryResult, setStockHistoryResult] = useState(null)
  const [watchlist, setWatchlist] = useState(() => readWatchlist())
  const [watchlistOnly, setWatchlistOnly] = useState(false)
  const [watchlistStorageAvailable, setWatchlistStorageAvailable] = useState(true)

  function toggleWatchlist(book) {
    const nextWatchlist = toggleBookInWatchlist(watchlist, book)
    setWatchlist(nextWatchlist)
    setWatchlistStorageAvailable(writeWatchlist(nextWatchlist))
  }

  function showBookDetails(book) {
    setStockHistoryResult(null)
    setSelectedBook(book)
  }

  function showWatchlist() {
    setWatchlistOnly((current) => !current)
    setSearchMode('title')
    setSearchTerm('')
    setSelectedAuthor('all')
    setSelectedSeries('all')
    setStatusFilter('all')
  }

  useEffect(() => {
    let isCancelled = false

    async function load() {
      setLoading(true)
      setError('')

      try {
        const [healthData, catalogData] = await Promise.all([
          fetchJson('/api/health'),
          fetchJson(tab === 'archive' ? '/api/archive' : tab === 'upcoming' ? '/api/releases' : `/api/catalog?tab=${tab}`),
        ])

        if (isCancelled) return

        setHealth(healthData)

        if (tab === 'upcoming') {
          setBooks(Array.isArray(catalogData.upcoming) ? catalogData.upcoming : [])
          setReleaseSummary(catalogData)
        } else {
          setBooks(Array.isArray(catalogData.hits) ? catalogData.hits : [])
          setReleaseSummary(null)
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err.message)
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      isCancelled = true
    }
  }, [tab])

  useEffect(() => {
    let isCancelled = false
    const bookId = selectedBook?.id
    const sourceType = String(selectedBook?.sourceType || 'official').trim().toLowerCase()

    if (!bookId || ['curated-archive', 'archive', 'historical'].includes(sourceType)) {
      return () => {
        isCancelled = true
      }
    }

    async function loadStockHistory() {
      try {
        const data = await fetchJson(`/api/history/${encodeURIComponent(bookId)}`)
        if (!isCancelled) {
          setStockHistoryResult({
            bookId,
            history: Array.isArray(data.history) ? data.history : [],
            error: '',
          })
        }
      } catch (err) {
        if (!isCancelled) setStockHistoryResult({ bookId, history: [], error: err.message })
      }
    }

    loadStockHistory()

    return () => {
      isCancelled = true
    }
  }, [selectedBook?.id, selectedBook?.sourceType])

  const authorOptions = useMemo(() => {
    const values = new Set()

    books.forEach((book) => {
      const author = book.author || book.authors?.join(', ') || ''
      if (author.trim()) values.add(author.trim())
    })

    return [...values].sort((a, b) => a.localeCompare(b))
  }, [books])

  const seriesOptions = useMemo(() => {
    const values = new Set()

    books.forEach((book) => {
      const series = book.series || ''
      if (series.trim()) values.add(series.trim())
    })

    return [...values].sort((a, b) => a.localeCompare(b))
  }, [books])

  const authorGroups = useMemo(() => {
    const groups = new Map()

    books.forEach((book) => {
      const author = book.author || book.authors?.join(', ') || 'Unknown author'
      groups.set(author, (groups.get(author) || 0) + 1)
    })

    return [...groups.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 12)
  }, [books])

  const seriesGroups = useMemo(() => {
    const groups = new Map()

    books.forEach((book) => {
      const series = book.series || 'Warhammer archive'
      groups.set(series, (groups.get(series) || 0) + 1)
    })

    return [...groups.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 12)
  }, [books])

  const filteredBooks = useMemo(() => {
    let items = watchlistOnly ? getWatchlistBooks(watchlist, books) : [...books]
    items = filterBooksByStatus(statusFilter, items)

    if (searchMode === 'title' && searchTerm.trim()) {
      const query = searchTerm.trim().toLowerCase()
      items = items.filter((book) => (book.title || '').toLowerCase().includes(query))
    }

    if (searchMode === 'author' && selectedAuthor !== 'all') {
      items = items.filter((book) => {
        const author = book.author || book.authors?.join(', ') || ''
        return author === selectedAuthor
      })
    }

    if (searchMode === 'series' && selectedSeries !== 'all') {
      items = items.filter((book) => (book.series || '') === selectedSeries)
    }

    return items.sort((a, b) => {
      if (sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '')
      }

      if (sortBy === 'price') {
        const priceA = Number.parseFloat(String(a.price || '0').replace(/[^\d.]/g, '')) || 0
        const priceB = Number.parseFloat(String(b.price || '0').replace(/[^\d.]/g, '')) || 0
        return priceB - priceA
      }

      if (sortBy === 'status') {
        const statusOrder = { available: 0, preorder: 1, 'sold-out-online': 2, 'temporarily-out-of-stock': 3, unknown: 4 }
        return (statusOrder[a.availabilityState] ?? 99) - (statusOrder[b.availabilityState] ?? 99)
      }

      return 0
    })
  }, [books, searchMode, searchTerm, selectedAuthor, selectedSeries, sortBy, statusFilter, watchlist, watchlistOnly])

  const visibleBooks = useMemo(() => filteredBooks.slice(0, visibleCount), [filteredBooks, visibleCount])

  useEffect(() => {
    setVisibleCount(24)
  }, [books, searchMode, searchTerm, selectedAuthor, selectedSeries, statusFilter, sortBy, watchlistOnly, watchlist, tab])

  const activeCollection = useMemo(() => {
    if (selectedAuthor !== 'all') {
      return { type: 'author', value: selectedAuthor }
    }

    if (selectedSeries !== 'all') {
      return { type: 'series', value: selectedSeries }
    }

    return null
  }, [selectedAuthor, selectedSeries])

  const collectionBooks = useMemo(() => {
    if (!activeCollection) {
      return books
    }

    return filterBooksByCollection(activeCollection.type, activeCollection.value, books)
  }, [activeCollection, books])

  const collectionSummary = useMemo(() => {
    if (!activeCollection) {
      return null
    }

    return getCollectionSummary(activeCollection.type, activeCollection.value, collectionBooks.length)
  }, [activeCollection, collectionBooks.length])

  const upcomingGroups = useMemo(() => {
    if (tab !== 'upcoming') return []

    const groups = new Map()

    filteredBooks.forEach((book) => {
      const monthKey = book.releaseDate ? book.releaseDate.slice(0, 7) : 'unknown'
      if (!groups.has(monthKey)) {
        groups.set(monthKey, [])
      }
      groups.get(monthKey).push(book)
    })

    return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right))
  }, [filteredBooks, tab])

  const provenanceBadges = useMemo(() => getProvenanceBadges(selectedBook || {}), [selectedBook])
  const selectedBookIsArchive = ['curated-archive', 'archive', 'historical'].includes(
    String(selectedBook?.sourceType || '').trim().toLowerCase(),
  )
  const selectedBookHistory = stockHistoryResult?.bookId === selectedBook?.id ? stockHistoryResult : null

  const stats = useMemo(() => {
    const available = books.filter((book) => book.availabilityState === 'available').length
    const preorders = books.filter((book) => book.availabilityState === 'preorder').length
    const soldOut = books.filter((book) =>
      ['sold-out-online', 'temporarily-out-of-stock'].includes(book.availabilityState),
    ).length

    return { total: books.length, available, preorders, soldOut }
  }, [books])

  return (
    <div className="app-shell">
      {selectedBook ? (
        <div className="book-modal-backdrop" onClick={() => setSelectedBook(null)}>
          <div className="book-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="close-modal" onClick={() => setSelectedBook(null)} aria-label="Close details">
              ×
            </button>

            <div className="book-modal-grid">
              <div className="book-modal-image-wrap">
                {selectedBook.image ? (
                  <img src={selectedBook.image} alt={selectedBook.title || 'Warhammer book'} />
                ) : (
                  <div className="cover-placeholder large">BL</div>
                )}
              </div>

              <div className="book-modal-content">
                  <div className="source-badges" aria-label="Provenance badges">
                    {provenanceBadges.map((badge) => (
                      <span key={`${badge.label}-${selectedBook.id || selectedBook.title}`} className={`provenance-chip ${badge.tone}`}>
                        {badge.label}
                      </span>
                    ))}
                  </div>

                <div className="book-status large" style={{
                  borderColor: selectedBook.availabilityColor || '#c9a84c',
                  color: selectedBook.availabilityColor || '#f2d57c',
                  background: `${selectedBook.availabilityColor || '#c9a84c'}1A`,
                }}>
                  {selectedBook.availabilityLabel || 'Available'}
                </div>

                <h3>{selectedBook.title || 'Untitled book'}</h3>
                <p className="detail-meta">
                  {selectedBook.author || selectedBook.authors?.join(', ') || 'Unknown author'}
                </p>

                <div className="detail-grid">
                  <div>
                    <span>Series</span>
                    <strong>{selectedBook.series || 'Warhammer archive'}</strong>
                  </div>
                  <div>
                    <span>Format</span>
                    <strong className="format-value">{selectedBook.format || selectedBook.editions?.[0]?.format || 'Book'}</strong>
                  </div>
                  <div>
                    <span>Release</span>
                    <strong>{selectedBook.releaseYear || selectedBook.editions?.[0]?.publishedOn || '—'}</strong>
                  </div>
                  <div>
                    <span>Price</span>
                    <strong>{selectedBook.price || 'Price unavailable'}</strong>
                  </div>
                </div>

                {selectedBook.sourceType === 'curated-archive' ? (
                  <div className="archive-editions">
                    <h4>Recorded editions</h4>
                    <p>Availability: not checked against the current official catalog.</p>
                    {selectedBook.editions?.map((edition) => (
                      <div className="archive-edition" key={edition.id}>
                        <strong className="format-value">{edition.format || 'Edition'}{edition.publishedOn ? ` · ${edition.publishedOn}` : ''}</strong>
                        <span>{[edition.publisher, edition.language, edition.isbn13 && `ISBN ${edition.isbn13}`].filter(Boolean).join(' · ')}</span>
                        <span>Record checked {edition.verifiedAt || selectedBook.verifiedAt || 'date not recorded'}</span>
                        <div className="archive-source-links">
                          {edition.sources?.map((source) => (
                            <a key={`${edition.id}-${source.url}`} href={source.url} target="_blank" rel="noreferrer">Source: {source.label}</a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {selectedBook.metadataSources ? (
                  <div className="metadata-source-list">
                    <span>Metadata sources</span>
                    {Object.entries(selectedBook.metadataSources).map(([field, source]) => (
                      <a key={field} href={source.sourceUrl || source.url} target="_blank" rel="noreferrer">
                        {field}: {source.sourceUrl || source.url}
                      </a>
                    ))}
                  </div>
                ) : null}

                <div className="stock-history-panel">
                  <div className="stock-history-header">
                    <span className="mini-label">Official stock history</span>
                    <h4>Availability changes</h4>
                  </div>
                  {selectedBookIsArchive ? (
                    <p className="stock-history-empty">Archive records are not monitored as live official stock.</p>
                  ) : !selectedBook.id ? (
                    <p className="stock-history-empty">This title has no official product ID for history lookup.</p>
                  ) : !selectedBookHistory ? (
                    <p className="stock-history-empty" role="status">Loading official history…</p>
                  ) : selectedBookHistory.error ? (
                    <p className="stock-history-empty error" role="alert">Could not load stock history: {selectedBookHistory.error}</p>
                  ) : selectedBookHistory.history.length === 0 ? (
                    <p className="stock-history-empty">No official observations recorded in the last seven days. Only titles monitored by the server are tracked.</p>
                  ) : (
                    <ol className="stock-history-list">
                      {selectedBookHistory.history.map((entry, index) => (
                        <li key={`${entry.ts}-${index}`} className="stock-history-row gold">
                          <div>
                            <span className="history-source">Official Black Library feed</span>
                            <strong>{getStockHistoryStatusLabel(entry)}</strong>
                          </div>
                          {entry.ts ? (
                            <time dateTime={entry.ts}>
                              {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.ts))}
                            </time>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>

                <p className="detail-summary">
                  {selectedBook.summary || 'No summary available for this title yet.'}
                </p>

                <div className="detail-actions">
                  {selectedBook.url ? (
                    <a href={resolveBookUrl(selectedBook.url)} target="_blank" rel="noreferrer" className="primary-button modal-button">
                      Open official page
                    </a>
                  ) : null}
                  <button type="button" className="secondary-button modal-button" onClick={() => setSelectedBook(null)}>
                    Close
                  </button>
                  <button
                    type="button"
                    className="secondary-button modal-button"
                    onClick={() => toggleWatchlist(selectedBook)}
                  >
                    {isBookWatched(watchlist, selectedBook) ? 'Remove from watchlist' : 'Add to watchlist'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-mark">⚙</div>
          <div>
            <div className="eyebrow">Warhammer books</div>
            <h1>Imperial Library</h1>
          </div>
        </div>
        <nav className="topnav" aria-label="Main navigation">
          <a href="#catalog">Catalog</a>
          <a href="#browse">Collections</a>
          <details className="project-menu">
            <summary>Project info</summary>
            <div className="project-menu-list">
              <a href="#product">Product principles</a>
              <a href="#architecture">Architecture</a>
              <a href="#roadmap">Roadmap</a>
            </div>
          </details>
        </nav>
      </header>

      <main>
        <section className="browse-panel" id="browse">
          <div className="catalog-header">
            <div>
              <span className="mini-label">Browse by collection</span>
              <h3>Author and series navigation</h3>
            </div>
          </div>

          <div className="browse-grid">
            <div className="browse-column">
              <h4>Authors</h4>
              <div className="chip-group">
                {authorGroups.map((group) => (
                  <button
                    key={group.name}
                    type="button"
                    className={selectedAuthor === group.name ? 'chip active' : 'chip'}
                    onClick={() => {
                      setSearchMode('author')
                      setSelectedAuthor(group.name)
                      setSelectedSeries('all')
                    }}
                  >
                    {group.name} <span>({group.count})</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="browse-column">
              <h4>Series</h4>
              <div className="chip-group">
                {seriesGroups.map((group) => (
                  <button
                    key={group.name}
                    type="button"
                    className={selectedSeries === group.name ? 'chip active' : 'chip'}
                    onClick={() => {
                      setSearchMode('series')
                      setSelectedSeries(group.name)
                      setSelectedAuthor('all')
                    }}
                  >
                    {group.name} <span>({group.count})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {collectionSummary ? (
            <div className="collection-panel">
              <div className="collection-header">
                <div>
                  <span className="mini-label">{collectionSummary.label}</span>
                  <h4>{collectionSummary.name}</h4>
                </div>

                <button
                  type="button"
                  className="secondary-button collection-button"
                  onClick={() => {
                    setSelectedAuthor('all')
                    setSelectedSeries('all')
                    setSearchMode('title')
                    setWatchlistOnly(false)
                  }}
                >
                  View full catalog
                </button>
              </div>

              <p className="collection-copy">
                Showing {collectionSummary.count} title{collectionSummary.count === 1 ? '' : 's'} from this collection.
              </p>
            </div>
          ) : null}
        </section>

        <section className="hero">
          <div className="hero-copy">
            <span className="pill">Web first • product strategy</span>
            <h2>The reference platform for Warhammer book availability, catalog data and reading context.</h2>
            <p>
              We are building a product that combines official stock tracking, curated metadata,
              editorial browsing and later-stage user accounts — without guessing when the source is weak.
            </p>
            <div className="cta-row">
              <a href="#roadmap" className="primary-button">View roadmap</a>
              <a href="#architecture" className="secondary-button">See architecture</a>
            </div>
          </div>

          <div className="hero-panel" aria-label="Product status panel">
            <div className="panel-card">
              <span className="label">Current focus</span>
              <strong>{health ? 'Backend connected' : 'Web product foundation'}</strong>
            </div>
            <div className="panel-list">
              <div><span className="dot green" /> {health ? `${health.watched} watched items` : 'Official stock'}</div>
              <div><span className="dot amber" /> {health ? 'API active' : 'Secondary-market visibility'}</div>
              <div><span className="dot blue" /> {health ? health.time : 'User-driven tracking'}</div>
            </div>
          </div>
        </section>

        <section className="feature-grid" id="product">
          {pillars.map((pillar) => (
            <article className="feature-card" key={pillar.title}>
              <span className="mini-label">Pillar</span>
              <h3>{pillar.title}</h3>
              <p>{pillar.text}</p>
            </article>
          ))}
        </section>

        <section className="details-grid" id="architecture">
          <div className="info-card">
            <span className="mini-label">Architecture</span>
            <h3>Source-aware product model</h3>
            <ul>
              <li>Official Black Library data remains the source of truth for current stock.</li>
              <li>Out-of-stock books are marked as historical or secondary-market entries.</li>
              <li>Metadata overrides remain conservative and verified before they enter the catalog.</li>
            </ul>
          </div>

          <div className="info-card">
            <span className="mini-label">Stack direction</span>
            <h3>What we are building next</h3>
            <ul>
              {stack.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="catalog-panel" id="catalog">
          <div className="catalog-header">
            <div>
              <span className="mini-label">{tab === 'archive' ? 'Curated archive' : tab === 'upcoming' ? 'Upcoming catalog' : 'Live catalog preview'}</span>
              <h3>{tab === 'archive' ? 'Historical archive editions' : tab === 'upcoming' ? 'Upcoming releases' : 'Official product feed'}</h3>
            </div>

            <div className="tab-group" aria-label="Catalog filters">
              {tabs.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  className={entry.key === tab ? 'tab-button active' : 'tab-button'}
                  onClick={() => setTab(entry.key)}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>

          {loading && <p className="state-text">Loading catalog…</p>}
          {error && <p className="state-text error">Could not connect to the API: {error}</p>}

          {!loading && !error && (
            <>
              <div className="search-mode-row" aria-label="Search mode selector">
                {['title', 'author', 'series'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={searchMode === mode ? 'mode-button active' : 'mode-button'}
                    onClick={() => setSearchMode(mode)}
                  >
                    {mode === 'title' ? 'Title' : mode === 'author' ? 'Author' : 'Series'}
                  </button>
                ))}
                <button
                  type="button"
                  className={watchlistOnly ? 'mode-button active' : 'mode-button'}
                  onClick={showWatchlist}
                  aria-pressed={watchlistOnly}
                >
                  Watchlist ({watchlist.length})
                </button>
              </div>

              {!watchlistStorageAvailable ? (
                <p className="state-text error" role="status">
                  Browser storage is unavailable. Watchlist changes will not persist after closing this page.
                </p>
              ) : null}

              <div className="catalog-toolbar">
                <div className="status-filters" aria-label="Status filters">
                  {['all', 'available', 'preorder', 'unavailable'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={statusFilter === option ? 'mode-button active' : 'mode-button'}
                      onClick={() => setStatusFilter(option)}
                    >
                      {option === 'all' ? 'All' : option === 'available' ? 'Available' : option === 'preorder' ? 'Pre-order' : 'Unavailable'}
                    </button>
                  ))}
                </div>

                {searchMode === 'title' ? (
                  <label className="search-box">
                    <span>Search by title</span>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Type a title"
                    />
                  </label>
                ) : null}

                {searchMode === 'author' ? (
                  <label className="search-box">
                    <span>Author</span>
                    <select value={selectedAuthor} onChange={(event) => setSelectedAuthor(event.target.value)}>
                      <option value="all">All authors</option>
                      {authorOptions.map((author) => (
                        <option key={author} value={author}>{author}</option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {searchMode === 'series' ? (
                  <label className="search-box">
                    <span>Series</span>
                    <select value={selectedSeries} onChange={(event) => setSelectedSeries(event.target.value)}>
                      <option value="all">All series</option>
                      {seriesOptions.map((series) => (
                        <option key={series} value={series}>{series}</option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <label className="sort-box">
                  <span>Sort</span>
                  <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                    <option value="title">Title</option>
                    <option value="price">Price</option>
                    <option value="status">Status</option>
                  </select>
                </label>
              </div>

              <div className="catalog-summary">
                <div className="summary-item">
                  <span className="summary-label">Visible</span>
                  <strong>{filteredBooks.length}</strong>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Available</span>
                  <strong>{stats.available}</strong>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Pre-order</span>
                  <strong>{stats.preorders}</strong>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Unavailable</span>
                  <strong>{stats.soldOut}</strong>
                </div>
              </div>

              {filteredBooks.length === 0 ? (
                <div className="empty-state">
                  <h4>{tab === 'archive' ? 'No curated archive titles are loaded yet.' : watchlistOnly && watchlist.length === 0 ? 'Your watchlist is empty.' : tab === 'upcoming' ? 'No upcoming releases match this filter.' : 'No books match this search.'}</h4>
                  <p>{tab === 'archive' ? 'Archive records will appear here after their sources and reuse terms have been reviewed.' : watchlistOnly && watchlist.length === 0 ? 'Add titles from the catalog to keep them here.' : tab === 'upcoming' ? 'Try a different month or reset the filters.' : 'Try another title, author or series name.'}</p>
                </div>
              ) : tab === 'upcoming' && upcomingGroups.length > 0 ? (
                <div className="release-groups">
                  {upcomingGroups.map(([monthKey, monthBooks]) => (
                    <div key={monthKey} className="release-group">
                      <h4>{formatMonthLabel(monthKey)}</h4>
                      <div className="book-grid">
                        {monthBooks.slice(0, visibleCount).map((book) => {
                          const url = book.url ? resolveBookUrl(book.url) : null
                          const statusText = book.availabilityLabel || 'Available'
                          const statusStyle = { borderColor: book.availabilityColor || '#c9a84c', color: book.availabilityColor || '#f2d57c', background: `${book.availabilityColor || '#c9a84c'}1A` }

                          return (
                            <article className="book-card" key={book.id || `${book.title}-${book.slug}`} onClick={() => showBookDetails(book)}>
                              <div className="book-image-wrap">
                                {book.image ? (
                                  <img src={book.image} alt={book.title || 'Warhammer book'} />
                                ) : (
                                  <div className="cover-placeholder">BL</div>
                                )}
                              </div>

                              <div className="book-status" style={statusStyle}>{statusText}</div>

                              <div className="source-badges" aria-label={`Source badges for ${book.title}`}>
                                {getProvenanceBadges(book).map((badge) => (
                                  <span key={`${badge.label}-${book.id || book.title}`} className={`provenance-chip ${badge.tone}`}>
                                    {badge.label}
                                  </span>
                                ))}
                              </div>

                              <h4>{book.title || 'Untitled book'}</h4>
                              <p className="book-author">{book.author || book.authors?.join(', ') || 'Unknown author'}</p>
                              <p className="book-series">{book.series || 'Warhammer archive'}</p>

                              <div className="book-meta">
                                <span className="format-value">{book.format || book.editions?.[0]?.format || 'Book'}</span>
                                <span>{book.releaseYear || book.editions?.[0]?.publishedOn || '—'}</span>
                              </div>

                              <div className="book-footer">
                                <strong>{book.sourceType === 'curated-archive' ? 'Archive record' : (book.price || 'Price unavailable')}</strong>
                                {url ? <a href={url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>Official listing</a> : null}
                                <button
                                  type="button"
                                  className={isBookWatched(watchlist, book) ? 'watchlist-icon active' : 'watchlist-icon'}
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    toggleWatchlist(book)
                                  }}
                                  aria-label={isBookWatched(watchlist, book) ? 'Remove from watchlist' : 'Add to watchlist'}
                                  title={isBookWatched(watchlist, book) ? 'Remove from watchlist' : 'Add to watchlist'}
                                >
                                  {isBookWatched(watchlist, book) ? '★' : '☆'}
                                </button>
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="book-grid">
                  {visibleBooks.map((book) => {
                    const url = book.url ? resolveBookUrl(book.url) : null
                    const statusText = book.availabilityLabel || 'Available'
                    const statusStyle = { borderColor: book.availabilityColor || '#c9a84c', color: book.availabilityColor || '#f2d57c', background: `${book.availabilityColor || '#c9a84c'}1A` }

                    return (
                      <article className="book-card" key={book.id || `${book.title}-${book.slug}`} onClick={() => showBookDetails(book)}>
                        <div className="book-image-wrap">
                          {book.image ? (
                            <img src={book.image} alt={book.title || 'Warhammer book'} />
                          ) : (
                            <div className="cover-placeholder">BL</div>
                          )}
                        </div>

                        <div className="book-status" style={statusStyle}>{statusText}</div>

                        <div className="source-badges" aria-label={`Source badges for ${book.title}`}>
                          {getProvenanceBadges(book).map((badge) => (
                            <span key={`${badge.label}-${book.id || book.title}`} className={`provenance-chip ${badge.tone}`}>
                              {badge.label}
                            </span>
                          ))}
                        </div>

                        <h4>{book.title || 'Untitled book'}</h4>
                        <p className="book-author">{book.author || book.authors?.join(', ') || 'Unknown author'}</p>
                        <p className="book-series">{book.series || 'Warhammer archive'}</p>

                        <div className="book-meta">
                          <span className="format-value">{book.format || book.editions?.[0]?.format || 'Book'}</span>
                          <span>{book.releaseYear || book.editions?.[0]?.publishedOn || '—'}</span>
                        </div>

                        <div className="book-footer">
                          <strong>{book.sourceType === 'curated-archive' ? 'Archive record' : (book.price || 'Price unavailable')}</strong>
                          {url ? <a href={url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>Official listing</a> : null}
                          <button
                            type="button"
                            className={isBookWatched(watchlist, book) ? 'watchlist-icon active' : 'watchlist-icon'}
                            onClick={(event) => {
                              event.stopPropagation()
                              toggleWatchlist(book)
                            }}
                            aria-label={isBookWatched(watchlist, book) ? 'Remove from watchlist' : 'Add to watchlist'}
                            title={isBookWatched(watchlist, book) ? 'Remove from watchlist' : 'Add to watchlist'}
                          >
                            {isBookWatched(watchlist, book) ? '★' : '☆'}
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}

              {filteredBooks.length > visibleCount ? (
                <div className="load-more-wrap">
                  <button type="button" className="primary-button load-more-button" onClick={() => setVisibleCount((count) => count + pageSize)}>
                    Load more ({Math.min(pageSize, filteredBooks.length - visibleCount)} more)
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>

        <section className="roadmap" id="roadmap">
          <span className="mini-label">Roadmap</span>
          <h3>Build in stages, not all at once</h3>
          <ol>
            {roadmap.map((step, index) => (
              <li key={step}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  )
}

export default App
