# Catalog Data Sources

This is a source and reuse review for the editorial archive. It is not legal advice. A public page or API response is not, by itself, permission to republish a whole database, cover image, synopsis, review, or user-generated rating.

## Source Decisions

| Source | Useful for | Current decision |
| --- | --- | --- |
| Black Library / Warhammer official feed | Current products, price, preorder, live availability, official product links | Already used by the watcher. Remains the sole authority for live stock. Do not use it to imply that an absent product is historically unavailable. |
| Lexicanum | Finding titles, series membership, order, author, and publication year | Its general disclaimer says Lexicanum text is CC BY-NC by default, unless an individual wiki/page specifies another license. The disclaimer's Commercial Use Waiver applies to Lexicanum's own use of contributor material, not to downstream users. The Terms of Service explicitly prohibit robots/scrapers unless Lexicanum gives express written permission, except RSS and its API used under applicable API policies. The 40K wiki `robots.txt` does not block `/wiki` pages and specifies `Crawl-delay: 5`; this is crawler guidance, not permission to copy/reuse content, and does not override the Terms or licenses. The main `lexicanum.com` robots file applies to its WordPress site, not the 40K wiki. The Terms page says it was last revised in August 2014; we could not find a public API-use policy or verify the list's page-specific license, so automated harvesting is blocked for us until current written permission or clear API terms are obtained. CC BY-NC text reuse still requires attribution and non-commercial use, and does not settle database rights. Ads, affiliate links, a slow request rate, or another scraper's existence do not provide permission. Two public projects demonstrate technical extraction, not authorization: [Jelle-Kuipers/Lexicanum-Scraper](https://github.com/Jelle-Kuipers/Lexicanum-Scraper) collects Space Marine chapter names, page links and image URLs; its README says the author is unsure about scraping etiquette, and its MIT license covers the code, not Lexicanum material. [LectitioLexicanus](https://github.com/JCalebBR/LectitioLexicanus) fetches filtered MediaWiki `extracts` into a Kindle MOBI; its GPL-3.0 is for the software, and we found no separate content permission. |
| Hardcover | Structured works, editions, series, publication facts and ISBNs | Best current candidate for the editorial catalog seed. Its policies expressly allow public/professional projects to use book, edition and series facts. Do not use other users' libraries, reading history, reviews, ratings, lists or other user-generated data; aggregate ratings require Hardcover attribution. The API is beta, token-authenticated, and its docs cap the free tier at 5,000 requests/day. Keep its token server-side. Do not hotlink Hardcover images in a professional project; image use also requires a DMCA takedown policy. |
| Wikidata | Work identities, creators, publication facts, series membership and identifiers | Strong low-friction discovery/cross-check source: structured data is CC0. Coverage is incomplete; a live sample query found 35 books linked to the Horus Heresy series, so do not treat it as a canonical complete list. Use SPARQL/API responsibly and retain item URLs/retrieval dates. |
| Wikipedia | Discovery and contextual references | Article text is CC BY-SA 4.0 and requires attribution and share-alike when reused. Do not copy prose into this project unless we can comply; media has separate licenses. Independently verified factual fields may be used as references, with attribution. |
| Google Books API | On-demand bibliographic lookup, ISBNs, edition hints | Candidate for targeted lookups. API terms include content-removal obligations and are not a blanket license to republish descriptions, covers, or a bulk export. Check API display/caching policies before storing or displaying returned content. |
| Open Library | ISBNs, editions, publication years, publishers and alternate language editions | Useful as a secondary edition/ISBN enrichment source. The monthly editions dump is about 9.2 GB (all-types dump about 12.4 GB); Open Library explicitly says not to bulk-download via API. Its licensing page says it asserts no new rights over the database but warns that existing rights issues may remain, so assess individual records/media and attribute the source. For ongoing API lookups, identify the app and obey rate limits. |
| Track of Words | Editorial chronology and review links | Use as a human research source and link to relevant articles. No reusable content license or public catalog API was verified; do not copy review text or scrape the site. |
| Grimdark Archive | UX inspiration and source discovery | Do not copy its catalog or ratings. Its own disclaimer identifies its sources, but does not grant reuse rights to its database. |

## Field Rules

- Current availability, preorder state, and price come only from the official feed.
- Each curated field must carry its own HTTPS `sourceUrl` and `verifiedAt` date.
- Store titles, authors, series, format, publication date, and ISBN as separate bibliographic facts; do not merge editions into one product record.
- Do not ingest cover images, publisher synopses, or review prose until a source-specific reuse basis is established. Prefer outbound links and original editorial summaries.
- Treat ratings as separately licensed, attributed aggregates. Never ingest individual user libraries, reviews, or reading histories into a public catalog.
- Keep the archive empty until a source has passed review and the entries can satisfy the provenance schema. The `/api/archive` endpoint returns an empty curated dataset rather than pretending official stock or returning 404.

## Recommended Source Order

1. Seed works, series and bibliographic facts from Hardcover's public catalog API, without importing user-generated content.
2. Cross-check identities and series relationships against Wikidata's CC0 structured data.
3. Enrich specific editions and ISBNs from Open Library's dump or carefully scoped lookups; do not use its API for bulk extraction.
4. Keep Black Library's official feed as the only live stock, preorder and price source.
5. Use Google Books and Track of Words for targeted verification and outbound references, not as a full-catalog scrape.

Before importing, pilot one series and report coverage, conflicts and missing fields per source. A source with gaps is useful as a layer; it is not the sole source of truth.

## Public References Checked

- [Grimdark Archive legal and data disclaimer](https://grimdarkarchive.com/disclaimer/)
- [Grimdark Archive privacy policy](https://grimdarkarchive.com/privacy/)
- [Hardcover API guide](https://docs.hardcover.app/api/getting-started/)
- [Hardcover policies](https://hardcover.app/pages/policies)
- [Wikidata copyright](https://www.wikidata.org/wiki/Wikidata:Copyright)
- [Wikidata SPARQL query service](https://query.wikidata.org/)
- [Wikipedia copyright policy](https://en.wikipedia.org/wiki/Wikipedia:Copyrights)
- [Google Books API terms](https://developers.google.com/books/terms)
- [Open Library API usage guidelines](https://openlibrary.org/developers/api)
- [Open Library database licensing](https://openlibrary.org/developers/licensing)
- [Open Library monthly data dumps](https://openlibrary.org/developers/dumps)
- [Lexicanum novel index](https://wh40k.lexicanum.com/wiki/List_of_Novels)
- [Lexicanum general disclaimer and licensing](https://wh40k.lexicanum.com/wiki/Warhammer_40k_-_Lexicanum:General_disclaimer)
- [Lexicanum Terms of Service](https://wh40k.lexicanum.com/wiki/Warhammer_40k_-_Lexicanum:Terms_of_Service)
- [Lexicanum 40K robots.txt](https://wh40k.lexicanum.com/robots.txt)
- [Lexicanum main-site robots.txt](https://lexicanum.com/robots.txt)
- [Lexicanum Games Workshop copyright disclaimer](https://wh40k.lexicanum.com/wiki/GW_Copyright)
- [Lexicanum Patreon information](https://wh40k.lexicanum.com/wiki/Lexicanum_Patreon)
- [Jelle-Kuipers Lexicanum scraper](https://github.com/Jelle-Kuipers/Lexicanum-Scraper)
- [LectitioLexicanus source project](https://github.com/JCalebBR/LectitioLexicanus)
- [Track of Words](https://www.trackofwords.com/)