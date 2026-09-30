# Frontend migration plan

## Goal

Move the project from a working static prototype to a scalable web product while preserving the existing backend logic and data flow.

## Current status

- The backend already reads Black Library data and normalizes availability.
- The frontend is already proving the product concept and user flows.
- The next step is a cleaner frontend architecture, not a replacement of the data and logic layers.

## Recommended target architecture

### Frontend
- React + Vite
- component-based layout
- state managed through hooks and a thin API layer
- modular pages: dashboard, release calendar, series, authors, book detail

### Backend
- Node.js + existing server logic
- explicit route groups for catalog, releases, watchlist and users
- source-aware metadata responses

### Data model
- Product
- Edition
- Author
- Series
- User
- Watchlist item
- Availability snapshot
- Purchase intent

## Delivery order

1. Stabilize the API contracts
2. Move the current UI into React components
3. Add author and series browsing
4. Add user authentication and personal data
5. Add PWA/mobile polish
6. Add purchase assistance flow

## Success criteria

- product data remains source-aware
- stock is unmistakably labeled as official or secondary-market
- UX is cleaner than the initial prototype
- the frontend can evolve without rewriting the backend logic
