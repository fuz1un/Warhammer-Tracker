import { useEffect, useState } from 'react'
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

async function fetchJson(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }
  return response.json()
}

function App() {
  const [health, setHealth] = useState(null)
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [healthData, catalogData] = await Promise.all([
          fetchJson('/api/health'),
          fetchJson('/api/catalog?tab=all'),
        ])

        setHealth(healthData)
        setBooks(Array.isArray(catalogData.hits) ? catalogData.hits.slice(0, 12) : [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return (
    <div className="app-shell">
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
              <button type="button">View roadmap</button>
              <button type="button" className="secondary">See architecture</button>
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
            <span className="mini-label">Live catalog preview</span>
            <h3>Official product feed</h3>
          </div>

          {loading && <p className="state-text">Loading catalog…</p>}
          {error && <p className="state-text error">Could not connect to the API: {error}</p>}

          {!loading && !error && (
            <div className="book-grid">
              {books.map((book) => (
                <article className="book-card" key={book.id || book.title}>
                  <div className="book-flag">{book.availabilityState || 'available'}</div>
                  <h4>{book.title || 'Untitled book'}</h4>
                  <p>{book.author || 'Unknown author'}</p>
                  <div className="book-meta">
                    <span>{book.format || 'Book'}</span>
                    <span>{book.price || '—'}</span>
                  </div>
                </article>
              ))}
            </div>
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
