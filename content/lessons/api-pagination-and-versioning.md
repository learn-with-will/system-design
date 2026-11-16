---
slug: api-pagination-and-versioning
title: "API Pagination & Versioning"
topic: networking-and-apis
kind: technique
summary: "Compare offset vs cursor pagination, and design evolutionary API versioning without breaking client contracts."
tags: [api, pagination, versioning, databases]
related: [rest-and-resource-modeling, relational-databases-and-acid, graphql-principles]
---
> **In one line:** Cursor pagination scales efficiently for large datasets without missed records, while URI versioning provides explicit evolution contracts.

## The idea
APIs that return lists of records cannot return millions of rows in a single HTTP response without exhausting server memory and crashing client applications. Pagination divides large datasets into manageable slices.

There are two primary pagination strategies:
1. **Offset-Based Pagination:** The client specifies `limit` (records per page) and `offset` (number of rows to skip), mapping directly to SQL `LIMIT x OFFSET y`. While simple to implement and allowing direct navigation to arbitrary page numbers, it suffers from two fatal flaws:
   - **Performance degradation at scale:** In relational databases, executing `OFFSET 1000000` requires the database engine to scan and discard one million rows before returning the requested ten rows, resulting in severe I/O penalties.
   - **Data drift (phantom records):** If a user inserts a new record on page 1 while a client is browsing, all subsequent records shift downward by one row. When the client requests page 2, they see a duplicate of the last record from page 1!
2. **Cursor (Keyset) Pagination:** The client specifies `limit` and an opaque `cursor` (typically a base64-encoded composite of an indexed timestamp and primary key, e.g., `created_at < 2026-11-16T20:00:00 AND id < 482`). The database executes an indexed range seek (`WHERE (created_at, id) < (:cursor_time, :cursor_id) ORDER BY created_at DESC LIMIT 20`). It performs in constant $O(1)$ time regardless of depth and is entirely immune to data drift.

**API Versioning** manages changes to data contracts over time. Breaking changes (removing fields, renaming keys, altering validation rules) must be introduced without breaking existing mobile and web clients. The most robust and explicit method is **URI versioning** (`/api/v1/orders` vs `/api/v2/orders`), making routing and deprecation unambiguous.

## See it
Compare offset and cursor pagination under relational database execution:

| Feature Dimension | Offset Pagination (`?limit=20&offset=1000`) | Cursor Pagination (`?limit=20&cursor=dXNyXzQ4`)|
|---|---|---|
| **Database Query** | `SELECT ... LIMIT 20 OFFSET 1000` | `SELECT ... WHERE id > :cursor LIMIT 20` |
| **Query Complexity** | $O(N)$ — scans and discards $N$ offset rows | $O(\log N)$ — direct B-tree index seek |
| **Deep Page Latency** | Degrades severely (seconds on deep pages) | Constant sub-millisecond lookup |
| **Data Drift Resistance** | Vulnerable (skips or duplicates records on insert) | Completely immune to concurrent inserts |
| **Random Page Jump** | Supported (can jump directly to page 50) | Not supported (sequential traversal only) |

```sql
-- Inefficient Offset Pagination on deep pages:
-- Scans and discards 500,000 rows!
SELECT id, email, created_at FROM users
ORDER BY created_at DESC
LIMIT 20 OFFSET 500000;

-- High-Performance Keyset (Cursor) Pagination:
-- Uses composite B-tree index on (created_at, id) for instant seek!
SELECT id, email, created_at FROM users
WHERE (created_at, id) < ('2026-11-10 14:22:00', 'usr_8819')
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

```json
// Clean Cursor API Response
{
  "data": [{ "id": "usr_8820", "email": "alice@example.com" }],
  "pagination": {
    "limit": 20,
    "has_more": true,
    "next_cursor": "ZXlKaGJHY2lPaUpTVXpVeE5pSXNJblI1Y0NJNklrcFhWQ0o5"
  }
}
```

> **Tip:** Always encode cursors as opaque base64 strings rather than exposing raw database column names to clients; this preserves freedom to change internal cursor indexing without breaking client contracts.

## Go deeper
The "Expand and Contract" pattern enables zero-downtime database and API evolutionary changes. In phase 1, expand the API by adding new optional fields alongside old fields. In phase 2, migrate all clients to the new fields. In phase 3, contract the API by deprecating and eventually removing the legacy fields.
## Watch out
- Do not use offset pagination on tables with millions of rows; deep crawls by scrapers will lock database resources.
- Never introduce breaking schema changes in an unversioned API endpoint; assume mobile clients running older app versions will never update.
## Remember
- Offset pagination degrades at scale and suffers from data drift; cursor pagination performs in constant time.
- Cursors should be opaque tokens generated from unique indexed columns (e.g., timestamp + UUID).
- Use explicit URI versioning (`/v1/`, `/v2/`) and the expand-and-contract pattern to evolve APIs without breaking clients.
