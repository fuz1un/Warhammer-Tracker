import { useEffect, useMemo, useState } from 'react'
import './App.css'

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
  const [sortBy, setSortBy] = useState('title')
  const [selectedBook, setSelectedBook] = useState(null)

  useEffect(() => {
    let isCancelled = false

    async function load() {
      setLoading(true)
      setError('')

      try {
        const [healthData, catalogData] = await Promise.all([
          fetchJson('/api/health'),
          fetchJson(`/api/catalog?tab=${tab}`),
        ])

        if (isCancelled) return

        setHealth(healthData)
        setBooks(Array.isArray(catalogData.hits) ? catalogData.hits : [])
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

  const filteredBooks = useMemo(() => {
    let items = [...books]

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
  }, [books, searchMode, searchTerm, selectedAuthor, selectedSeries, sortBy])

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
                    <strong>{selectedBook.format || 'Book'}</strong>
                  </div>
                  <div>
                    <span>Release</span>
                    <strong>{selectedBook.releaseYear || '—'}</strong>
                  </div>
                  <div>
                    <span>Price</span>
                    <strong>{selectedBook.price || 'Price unavailable'}</strong>
                  </div>
                </div>

                <p className="detail-summary">
                  {selectedBook.summary || 'No summary available for this title yet.'}
                </p>

                <div className="detail-actions">
                  <a href={resolveBookUrl(selectedBook.url)} target="_blank" rel="noreferrer" className="primary-button modal-button">
                    Open official page
                  </a>
                  <button type="button" className="secondary-button modal-button" onClick={() => setSelectedBook(null)}>
                    Close
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
          <a href="#product">Product</a>
          <a href="#roadmap">Roadmap</a>
          <a href="#architecture">Architecture</a>
        </nav>
      </header>

      <main>
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

        <section className="catalog-panel">
          <div className="catalog-header">
            <div>
              <span className="mini-label">Live catalog preview</span>
              <h3>Official product feed</h3>
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
              </div>

              <div className="catalog-toolbar">
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
                  <h4>No books match this search.</h4>
                  <p>Try another title, author or series name.</p>
                </div>
              ) : (
                <div className="book-grid">
                  {filteredBooks.map((book) => {
                  const url = resolveBookUrl(book.url)
                  const statusText = book.availabilityLabel || 'Available'
                  const statusStyle = { borderColor: book.availabilityColor || '#c9a84c', color: book.availabilityColor || '#f2d57c', background: `${book.availabilityColor || '#c9a84c'}1A` }

                  return (
                    <article className="book-card" key={book.id || `${book.title}-${book.slug}`} onClick={() => setSelectedBook(book)}>
                      <div className="book-image-wrap">
                        {book.image ? (
                          <img src={book.image} alt={book.title || 'Warhammer book'} />
                        ) : (
                          <div className="cover-placeholder">BL</div>
                        )}
                      </div>

                      <div className="book-status" style={statusStyle}>{statusText}</div>

                      <h4>{book.title || 'Untitled book'}</h4>
                      <p className="book-author">{book.author || book.authors?.join(', ') || 'Unknown author'}</p>
                      <p className="book-series">{book.series || 'Warhammer archive'}</p>

                      <div className="book-meta">
                        <span>{book.format || 'Book'}</span>
                        <span>{book.releaseYear || '—'}</span>
                      </div>

                      <div className="book-footer">
                        <strong>{book.price || 'Price unavailable'}</strong>
                        <a href={url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>Open</a>
                      </div>
                    </article>
                    )
                  })}
                </div>
              )}
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
