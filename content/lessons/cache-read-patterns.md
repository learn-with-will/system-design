---
slug: cache-read-patterns
title: "Cache Read Patterns"
topic: storage-and-caching
kind: pattern
summary: "Master Cache-Aside and Read-Through caching patterns, evaluating latency, application logic, and failover behavior."
tags: [caching, cache-aside, read-through, patterns]
related: [caching-fundamentals-and-tiers, cache-write-patterns, cache-invalidation-and-stampedes]
---
> **In one line:** Cache-Aside puts the application in charge of checking and populating the cache; Read-Through lets the cache fetch missing data transparently.

## The idea
When an application needs to read data, it must coordinate between the fast cache and the slower backing database. The two primary patterns for read coordination are Cache-Aside and Read-Through.

**Cache-Aside (Lazy Loading):**
In the Cache-Aside pattern, the application code directly orchestrates both the cache and the database:
1. The application checks the cache for the requested key.
2. **Cache Hit:** If found, the application returns the cached data immediately.
3. **Cache Miss:** If not found, the application queries the database, writes the retrieved data into the cache (usually with an expiration TTL), and returns the data to the client.
- *Advantages:* Highly resilient. If the cache cluster crashes or suffers maintenance, the application can fall back to querying the database directly (albeit with increased latency). The cache model can also differ from the database schema (e.g., storing a pre-computed JSON aggregation).
- *Disadvantages:* Each cache miss incurs a three-step penalty (read cache, read DB, write cache). Furthermore, data can become stale if writes modify the database without invalidating the cache.

**Read-Through Caching:**
In a Read-Through architecture, the application treats the cache as the main data store. When a cache miss occurs, the cache itself transparently reads the data from the backing database, populates its internal memory, and returns the result to the application.
- *Advantages:* Simplifies application code; the application interacts with a single unified data API.
- *Disadvantages:* Requires database-specific cache plugins, tightly couples cache infrastructure to database schemas, and makes caching failures harder to isolate.

## See it
Compare the request flow in Cache-Aside vs Read-Through:

```flow
app: Application Logic | Orchestrates reads @primary
cache: Distributed Cache | In-memory Redis @blue
db: Backing Database | PostgreSQL @green
app -> cache: 1. Check cache
app -> db: 2. Query DB on miss
```

```javascript
// Production Cache-Aside implementation in Node.js
async function getUserProfile(userId) {
  const cacheKey = `user:${userId}:profile`;
  
  // 1. Check in-memory Redis cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached); // Cache HIT
  }

  // 2. Cache MISS: Query primary PostgreSQL database
  const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  if (!user.rows[0]) return null;

  // 3. Populate cache with 1-hour TTL (3600 seconds)
  await redis.setex(cacheKey, 3600, JSON.stringify(user.rows[0]));
  return user.rows[0];
}
```

> **Tip:** Cache-Aside is the default pattern used across modern web development because of its resilience and flexibility. If Redis goes down, your app continues functioning directly against PostgreSQL.

## Go deeper
When a new service launches or an existing cache is flushed, the cache starts completely empty (a **cold cache**). The first wave of requests all result in cache misses, causing a traffic spike on the database. To prevent this, architectures use **cache warming**: running a script before launching traffic that pre-populates the cache with the top 20% most popular items.
## Watch out
- In Cache-Aside, ensure that cache writes on a miss always include an expiration TTL; otherwise, stale data can persist indefinitely.
- Watch out for race conditions where concurrent reads on a cache miss overwrite a recent database write with older data.
## Remember
- Cache-Aside requires application code to check the cache, read the database on a miss, and write back to the cache.
- Read-Through delegates backing store lookups directly to the cache engine.
- Cache-Aside provides superior fault tolerance because application logic can fall back to the database if the cache fails.
