---
slug: cache-write-patterns
title: "Cache Write Patterns"
topic: storage-and-caching
kind: pattern
summary: "Compare Write-Through, Write-Around, and Write-Back (Write-Behind) strategies for data modification."
tags: [caching, write-through, write-back, write-around]
related: [cache-read-patterns, cache-invalidation-and-stampedes, relational-databases-and-acid]
---
> **In one line:** Write patterns determine whether updates modify the cache, the database, or both, balancing write latency against data consistency.

## The idea
When application data is created or updated, the system must synchronize the change between the cache and the primary backing database. How you handle writes determines data freshness, write latency, and data loss risk.

There are three classic cache write patterns:
1. **Write-Through:** Data is written to the cache and the database simultaneously. The write operation does not return success to the client until *both* the cache and the database have persisted the change.
   - *Pros:* Data in the cache is never stale; reads following a write are instantly cached.
   - *Cons:* High write latency, because every write operation pays the penalty of writing to both memory and slow disk synchronously.
2. **Write-Around:** Data is written directly to the database, completely bypassing the cache. The cache is only populated later when a subsequent read incurs a cache miss (via Cache-Aside).
   - *Pros:* Prevents cache pollution. In workloads where data is written once and rarely read again (e.g., historical audit logs or temporary transaction records), Write-Around avoids flooding the cache with useless keys.
   - *Cons:* The first read after a write is guaranteed to be a slow cache miss.
3. **Write-Back (Write-Behind):** Data is written exclusively to the fast in-memory cache, and the write immediately returns success to the client. The cache asynchronously batches and flushes the updates to the backing database in the background (e.g., every 5 seconds).
   - *Pros:* Ultra-low write latency and massive write throughput. Multiple rapid updates to the same record (e.g., video view counts) can be collapsed into a single database update.
   - *Cons:* **Extreme risk of data loss.** If the cache server crashes or loses power before the background flush completes, uncommitted updates in memory are permanently lost.

## See it
Compare the synchronization characteristics across the three write patterns:

| Pattern | Write Path Sequence | Write Latency | Stale Read Risk | Data Loss Risk on Crash |
|---|---|---|---|---|
| **Write-Through** | App -> Cache + DB synchronously | High (pays both write costs) | Zero (cache always fresh) | Zero (persisted in DB) |
| **Write-Around** | App -> DB directly; bypasses cache | Moderate (DB write only) | Low (if invalidation used) | Zero (persisted in DB) |
| **Write-Back** | App -> Cache; async flush to DB | Ultra-low (memory speed) | Zero (reads hit fresh cache) | **High** (in-memory data lost) |

```flow
app: Application Client | Initiates write @primary
cache: In-Memory Cache | Updated in 1ms @green
db: Primary Database | Asynchronous flush @blue
app -> cache: 1. Write to cache (Returns OK immediately)
cache -> db: 2. Background batch flush (Every 5 seconds)
```

```javascript
// Write-Around pattern: Write to DB, delete cache key
async function updateProductPrice(productId, newPrice) {
  // 1. Update source of truth in database
  await db.query('UPDATE products SET price = $1 WHERE id = $2', [newPrice, productId]);
  
  // 2. Invalidate cache key (next read will reload fresh data)
  await redis.del(`product:${productId}`);
}
```

> **Tip:** In Write-Around, prefer **deleting** the cache key (`redis.del`) rather than updating it (`redis.set`). If two concurrent writes occur, deleting avoids race conditions where a stale write overwrites a newer write in the cache.

## Go deeper
Write-Back caching is extensively utilized in gaming architectures (saving player position in memory and flushing to disk periodically) and high-volume counters (buffering YouTube video view counts in Redis and writing aggregated batches of 1,000 views to PostgreSQL).
## Watch out
- Never use Write-Back caching for financial transactions, billing records, or user credentials where data loss is unacceptable.
- In Write-Through, ensure the database write succeeds before confirming the cache update to prevent phantom records in cache.
## Remember
- Write-Through writes to cache and database synchronously, ensuring fresh reads at the cost of write latency.
- Write-Around writes directly to the database, preventing cache pollution for write-heavy, infrequently read data.
- Write-Back writes to memory and flushes asynchronously, delivering maximum throughput at the risk of data loss.
