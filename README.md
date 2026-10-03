# ⚙ WH40K — Imperial Library

A catalog and stock tracker for Black Library titles, built around real availability data, curated metadata, and future multi-user product workflows.

This project combines:
- stock and preorder monitoring
- release and news tracking
- product catalog enrichment
- author and series views
- watchlist and collection tracking
- a long-term path toward a true editorial + community platform

## Project goal

The long-term ambition is not simply to track whether a book is in stock.
The goal is to become the reference platform for Warhammer books:
- official availability when it exists
- secondary-market visibility when it does not
- clean bibliographic metadata
- reading order and series context
- personal tracking for users
- later-stage purchase assistance for watched titles

In short, we want to become the best source for information, discovery, and restock tracking around Warhammer books, while preserving trust in the source data.

---

## Current state

### Completed milestones
- [x] Node.js server foundation
- [x] Static frontend served from `/`
- [x] Books and stock API
- [x] Watcher with email and Discord notifications
- [x] Availability normalization and state transitions
- [x] Richer catalog metadata layer
- [x] Catalog and release endpoints
- [x] URL sanitization and secret masking in logs
- [x] Regression tests for stock and normalization logic

### In progress / delivered lately
- [x] New Releases / upcoming browsing experience
- [x] Book detail panel
- [x] Series / author / reading groupings
- [x] Collection, wishlist and personal history flows
- [x] Correction reporting for missing or wrong metadata
- [x] Hardened configuration and safer local setup
- [x] Final smoke tests and integrated validation
- [x] Archive API route and source-gated catalog foundation

---

## Product vision and strategic direction

This project is currently a strong tracker for official stock and catalog signals, but the true end-state is a larger editorial and community product.

The core idea is:
- Official Black Library data remains the source of truth for active stock, price and preorder status.
- Older or sold-out titles are treated as historical / secondary-market inventory, not as if they were still available on the official shop.
- Curated metadata is layered on top of official data to improve discovery, bibliographic context, and author/series coverage.
- User features come later, once the data and product foundations are stable.

This is important because the older books are no longer necessarily available on the official site, while Grimdark Archive and similar sites rely on reseller availability and broader catalog aggregation.
That means the right model is not “everything is official” but “everything has a source and a trust layer.”

---

## Architecture overview

### Backend
Main file:
- `watcher/server.js`

Responsibilities:
- serve the frontend
- query Algolia for Black Library product data
- normalize availability states
- detect stock transitions
- dispatch email and Discord notifications
- store local watcher state
- expose catalog and release endpoints

### Frontend
Main file:
- `web/src/App.jsx` (React + Vite)

Responsibilities:
- browse the live catalog and preorders
- search and filter by title, author and series
- view book details and author / series collections
- manage a browser-local watchlist in `localStorage`

The current watchlist is stored per browser and device. It does not sync between devices or users; that requires the later account and backend-persistence phase.

---

## Data provenance and constraints

The app queries the public Black Library Algolia index through the backend. The current source provides title, price, availability, preorder status, author, series, format, genre, description, image, slug and the `isNewRelease` flag.

That is strong for modern store activity, but it does not fully cover editorial metadata like publication date, ISBNs, audiobook metadata, faction-specific ordering, or reading order guidance. That is why the “New Releases” section is useful for official novelty tracking, but not a full editorial chronology.

We intentionally avoid pretending that a third-party catalog is the same as the official store source. A useful product needs source clarity:
- official source
- reseller source
- curated override
- historical record
- community report

This gives us a real trust model, which is essential for a product that aims to be useful beyond a simple watcher.

The archive endpoint is now available, but its curated catalog is intentionally empty until each source's reuse terms are reviewed and every imported field has its own verified provenance. See [catalog source review](docs/catalog-data-sources.md).

### Verified metadata overrides

To fill missing fields without altering official sales data, the project uses `watcher/catalog-overrides.json`, keyed by stable product ID. Accepted fields are `authors`, `series`, `releaseDate`, and `isbn`.
Each override requires:
- `value`
- `sourceUrl` using HTTPS
- `verifiedAt` in `YYYY-MM-DD` format

Invalid overrides are ignored. The server reloads the file after changes.

Example:

```json
{
  "schemaVersion": 1,
  "records": {
    "PRODUCT-ID": {
      "releaseDate": {
        "value": "2026-09-19",
        "sourceUrl": "https://example.org/source-for-this-edition",
        "verifiedAt": "2026-09-30"
      }
    }
  }
}
```

This is intentionally conservative and should remain conservative. We do not guess missing authors or series from weak signals.

---

## Product roadmap

### Phase 1 — source-of-truth and stock tracking
- [x] define the data model for the catalog
- [x] add richer metadata to the book model
- [x] add catalog and releases endpoints
- [x] sanitize URLs and harden logs
- [x] implement watched collections and notifications
- [x] richer filtering in the frontend

### Phase 2 — release discovery and editorial browsing
- [x] new releases tab
- [x] upcoming / future release tab
- [x] order by date and show release groups
- [x] month-based grouping for release browsing
- [x] pagination or incremental loading

### Phase 3 — product details and provenance
- [x] book detail panel
- [x] show summary, author, series, format and release date
- [x] show inferred relations between authors and series
- [x] show stock history by source
- [x] show provenance badges clearly

### Phase 4 — series and reading flow
- [x] grouping by series
- [x] author views
- [x] reading-order style organization
- [ ] true series detail pages with chronology and publication order

### Phase 5 — personal library and tracking
- [x] owned / read / wishlist states
- [x] browser-local watchlist persistence for catalog titles
- [x] personal library dashboard
- [x] quick marking within the interface

### Phase 6 — quality, safety and scaling
- [x] input validation and API hardening
- [x] safer fallbacks and error handling
- [x] security-minded configuration structure
- [x] log sanitization and safe output
- [x] local report flow for missing or incorrect metadata

### Phase 7 — user accounts and multi-user platform
- [ ] auth and user sessions
- [ ] multi-user watchlists and collection states
- [ ] profile settings and notification preferences
- [ ] user history and personal dashboards

### Phase 8 — purchase assistance and automation
- [ ] connect the user’s Black Library account or equivalent purchase flow
- [ ] build purchase-intent tracking for watched books
- [ ] notify when watched items restock
- [ ] support checkout assistance with a human confirmation step

---

## UX / UI roadmap

The product is already working as a tracker, but the UI still sits in the “functional prototype” layer. That is fine for the first version, but we need to evolve it intentionally.

### UX phase 1 — clarity and trust
- improve card information hierarchy
- show source clearly on every book
- distinguish official vs secondary-market availability
- display clear labels such as “official”, “historical”, “reseller”, “curated metadata”

### UX phase 2 — browsing quality
- cleaner filters and search behaviour
- release calendar and upcoming views
- better groupings by series, author and month
- stronger mobile responsiveness

### UX phase 3 — editorial product feel
- dedicated pages for authors and series
- publication chronology and reading order
- visual identity aligned with the Warhammer aesthetic without feeling cluttered
- richer book details with provenance and editorial context

### UX phase 4 — user platform experience
- sign-in flow
- user dashboards
- custom watchlists and collections
- saved preferences and alerts
- profile management and growth loops

This part is continuous. We do not wait to finish the entire platform before improving the product experience. We iterate in small waves and keep the usability improving as the product grows.

---

## Should we keep using only HTML?

Short answer: not for the final product.

### What HTML/CSS/JS is good for
- very fast prototypes
- single-page catalog views
- internal tools
- early experimentation
- low-friction validation of the core logic

That is exactly what this project already is: an efficient proof of concept with working functionality.

### What it is not good for long-term
- multi-user auth
- complex state management
- a richer product UX with many views
- maintainable component architecture
- clean separation between frontend and backend concerns
- future scaling and collaboration

### Recommended direction
Keep the current HTML/CSS/JS version as a prototype and foundation, but evolve toward a modern frontend stack once the product pain points become clear.

A sensible next step is:
- Keep the Node backend
- Move the frontend to a framework such as React or Vue via Vite
- Use a clean API contract between frontend and backend
- Keep the data and business logic in the backend, not in the browser

This gives us the best of both worlds:
- we keep the speed of iteration
- we get maintainability and product quality
- we avoid becoming stuck in a single-file UI model forever

For a personal project and portfolio piece, a hybrid path is ideal:
- prototype in plain HTML to validate the concept quickly
- then modernize the frontend once the architecture is proven

That is the right path for this project and for a CV-worthy product story.

---

## Development rules

### Security
- never log secrets or API keys in plain text
- mask sensitive values in logs
- validate all external URLs before use
- reject unsafe links like `javascript:` / `data:` / `vbscript:`
- keep local secrets outside the frontend
- apply strict origin and header controls for future public exposure

### Good practices
- keep changes small and verifiable
- add regression tests for business logic
- separate watch logic from catalog logic
- prioritize personal use and reliability before large public exposure
- keep source provenance explicit at every layer

---

## Local verification

```bash
# from the project root
node --test watcher/test/availability.test.js
```

This validates the core normalization and stock-state logic.

---

## Useful commit messages

- `feat: add catalog metadata and release endpoints`
- `fix: sanitize urls and mask secrets in logs`
- `chore: update roadmap and milestones`

---

## Recommended next step

Implement the next major product iteration by focusing on:
1. clear source labeling for official vs secondary-market data
2. better UX for search, filters and detail views
3. author / series pages with rich editorial context
4. user authentication and multi-user tracking
5. then purchase-assistance flows after the foundation is stable

## Quick setup

1. Copy the config file:

```bash
cp watcher/config.example.json watcher/config.json
```

2. Edit `watcher/config.json`:

```json
{
  "emailEnabled": true,
  "emailUser": "your@gmail.com",
  "emailPass": "xxxx xxxx xxxx xxxx",
  "emailTo": "your@gmail.com",
  "discordEnabled": true,
  "discordWebhook": "https://discord.com/api/webhooks/..."
}
```

3. Start it:

```bash
docker compose up -d
```

4. Open `http://localhost:8080`

## How to get a Gmail App Password

Follow Google’s App Password flow in the account settings and generate an app-specific password for SMTP use.

This project is intentionally being built as a strong base for a real product story: a catalog and tracker with trustable data, clear provenance, and a roadmap toward a multi-user editorial platform.


1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Security → 2-Step Verification (enable it if it isn't already)
3. Security → App passwords → Create one for "WH Watcher"
4. Copy the generated 16-character code

## How to get a Discord Webhook

Discord channel → Edit Channel → Integrations → Webhooks → New Webhook → Copy URL

## Check intervals (default)

| Type               | Interval | Notes                              |
| ------------------ | -------- | ----------------------------------- |
| Watched books      | 2 min    | Configurable in the app (Config)    |
| Pre-orders         | 10 min   | GW releases them on Friday mornings |

## Useful commands

```bash
docker compose up -d          # Start
docker compose down           # Stop
docker compose logs -f        # View logs
docker compose up -d --build  # Rebuild after changes

# Test notifications (or use the button in the app)
curl -X POST http://localhost:8080/test-notify

# Check status
curl http://localhost:8080/health
```

## On Unraid (single container via UI)

- **Repository:** leave empty (uses local build) or build the image beforehand with `docker build`
- **Name:** `wh-tracker`
- **Port:** `8080:8080`
- **Path 1:** Host `/mnt/user/appdata/wh-tracker/data` → Container `/app/data`
- **Path 2:** Host `/mnt/user/appdata/wh-tracker/config.json` → Container `/app/config.json`

Copy the files to `/mnt/user/appdata/wh-tracker/` via SSH or File Manager,
run `docker build -t wh-tracker ./watcher`, and use the `wh-tracker` image.

