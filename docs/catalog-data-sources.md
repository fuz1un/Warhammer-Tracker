# Catalog Data Sources

This is a source and reuse review for the editorial archive. It is not legal advice. A public page or API response is not, by itself, permission to republish a whole database, cover image, synopsis, review, or user-generated rating.

## Source Decisions

| Source | Useful for | Current decision |
| --- | --- | --- |
| Black Library / Warhammer official feed | Current products, price, preorder, live availability, official product links | Already used by the watcher. Remains the sole authority for live stock. Do not use it to imply that an absent product is historically unavailable. |
| Lexicanum | Finding titles, series membership, order, author, and publication year | Manual research and links only for now. The site's reuse/license page could not be verified from its public pages, so do not bulk-copy or scrape its list until its terms or permission are confirmed. |
| Hardcover | Structured book and series metadata | Candidate, not integrated. Its GraphQL API is beta, requires an account token, and says public/commercial applications must not use user-owned data. Public catalog metadata may be useful after endpoint scope, terms, and attribution are reviewed. Never expose a token in the browser. |
| Wikipedia | Discovery and contextual references | Article text is CC BY-SA 4.0 and requires attribution and share-alike when reused. Do not copy prose into this project unless we can comply; media has separate licenses. Independently verified factual fields may be used as references, with attribution. |
| Google Books API | On-demand bibliographic lookup, ISBNs, edition hints | Candidate for targeted lookups. API terms include content-removal obligations and are not a blanket license to republish descriptions, covers, or a bulk export. Check API display/caching policies before storing or displaying returned content. |
| Open Library | ISBN and edition lookup, cover discovery | Human-triggered lookups only. Open Library says its API is not intended as a third-party data backend or for bulk downloading; use its dumps or contact the project for bulk/partner use. Respect its User-Agent and rate limits. |
| Track of Words | Editorial chronology and review links | Use as a human research source and link to relevant articles. No reusable content license or public catalog API was verified; do not copy review text or scrape the site. |
| Grimdark Archive | UX inspiration and source discovery | Do not copy its catalog or ratings. Its own disclaimer identifies its sources, but does not grant reuse rights to its database. |

## Field Rules

- Current availability, preorder state, and price come only from the official feed.
- Each curated field must carry its own HTTPS `sourceUrl` and `verifiedAt` date.
- Store titles, authors, series, format, publication date, and ISBN as separate bibliographic facts; do not merge editions into one product record.
- Do not ingest cover images, publisher synopses, or review prose until a source-specific reuse basis is established. Prefer outbound links and original editorial summaries.
- Treat ratings as separately licensed, attributed aggregates. Never ingest individual user libraries, reviews, or reading histories into a public catalog.
- Keep the archive empty until a source has passed review and the entries can satisfy the provenance schema. The `/api/archive` endpoint returns an empty curated dataset rather than pretending official stock or returning 404.

## Public References Checked

- [Grimdark Archive legal and data disclaimer](https://grimdarkarchive.com/disclaimer/)
- [Grimdark Archive privacy policy](https://grimdarkarchive.com/privacy/)
- [Hardcover API guide](https://docs.hardcover.app/api/getting-started/)
- [Wikipedia copyright policy](https://en.wikipedia.org/wiki/Wikipedia:Copyrights)
- [Google Books API terms](https://developers.google.com/books/terms)
- [Open Library API usage guidelines](https://openlibrary.org/developers/api)
- [Lexicanum novel index](https://wh40k.lexicanum.com/wiki/List_of_Novels)
- [Track of Words](https://www.trackofwords.com/)