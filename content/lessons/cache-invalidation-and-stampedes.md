---
slug: cache-invalidation-and-stampedes
title: "Cache Invalidation & Stampedes"
topic: storage-and-caching
kind: pitfall
summary: "Mitigate the two hardest problems in caching: invalidation staleness and thundering herd cache stampedes."
tags: [caching, invalidation, cache-stampede, thundering-herd]
related: [caching-fundamentals-and-tiers, cache-read-patterns, cache-eviction-and-ttl]
---
> **In one line:** Cache stampedes occur when thousands of concurrent requests miss simultaneously on an expired key, overwhelming the backing database.

## The idea
As Phil Karlton famously observed: *"There are only two hard things in Computer Science: cache invalidation and naming things."* Once data is copied into a cache, keeping that copy synchronized with the underlying database without causing catastrophic outages is a major distributed engineering challenge.

Two critical failure modes plague production caches:

1. **Cache Invalidation:** When a user updates their profile in the database, the cached version is now stale. If the cache is not invalidated, subsequent readers see outdated data. If invalidation logic is buggy, data corruption spreads across tiers.
2. **The Cache Stampede (Thundering Herd):** Consider a viral homepage item that receives 10,000 requests per second, cached with a 10-minute TTL. At minute 10, the key expires. Within the next 50 milliseconds, 500 concurrent incoming requests experience a **cache miss simultaneously**. All 500 requests bypass the cache and fire expensive SQL queries at the database at the exact same moment. The database CPU hits 100%, query latency spikes from 10 ms to 10 seconds, connection pools exhaust, and the entire database collapses.

Mitigating cache stampedes requires defensive patterns:
- **Mutual Exclusion (Mutex Locking):** On a cache miss, the first worker thread acquires a distributed lock in Redis (`SET key lock NX EX 5`). Only the thread holding the lock queries the database and repopulates the cache; all other threads sleep for 50 ms and retry the cache.
- **Probabilistic Early Expiration (XFetch):** Background workers recalculate the cache *before* it expires based on request frequency and remaining TTL.

## See it
Consider how a distributed mutex lock prevents a cache stampede during an expiration:

```flow
client: 1000 Concurrent Requests | Key expires at T0 @neutral
lock: Distributed Lock | SET key:lock NX @primary
winner: Winning Request | Granted lock @green
sleepers: 999 Waiting Requests | Sleep 50ms & retry @amber
db: Primary Database | Exactly 1 query @blue
client -> lock: Concurrent requests
lock -> winner: Lock granted
lock -> sleepers: Rejected (Retry cache)
winner -> db: Query database
```

```javascript
// Preventing cache stampedes with Redis distributed mutex locking
async function getWithMutex(key, fetchFromDbFn, ttlSeconds = 300) {
  let value = await redis.get(key);
  if (value) return JSON.parse(value);

  const lockKey = `lock:${key}`;
  // Try to acquire lock with 5-second lease
  const acquired = await redis.set(lockKey, '1', 'NX', 'EX', 5);

  if (acquired) {
    try {
      // Sole thread queries the database
      const data = await fetchFromDbFn();
      await redis.setex(key, ttlSeconds, JSON.stringify(data));
      return data;
    } finally {
      await redis.del(lockKey); // Release lock
    }
  } else {
    // Other threads sleep and retry cache
    await new Promise(resolve => setTimeout(resolve, 50));
    return getWithMutex(key, fetchFromDbFn, ttlSeconds);
  }
}
```

> **Tip:** An alternative to locking is the **Probabilistic Early Recomputation** algorithm (Vattani et al., 2015), where requests compute an early re-fetch probability: as a key approaches its expiration time, the probability that an incoming request refreshes it in the background increases smoothly.

## Go deeper
Cache invalidation can also be automated using **Change Data Capture (CDC)**. By streaming PostgreSQL Write-Ahead Logs via Debezium and Kafka, a dedicated consumer service intercepts database updates in real time and automatically sends targeted `DEL` commands to Redis, completely decoupling invalidation from application web code.
## Watch out
- Never allow hundreds of concurrent threads to execute identical database queries on a cache miss; enforce distributed locking or single-flight coalescing.
- Ensure distributed locks have an automatic expiration TTL; otherwise, if a worker node crashes mid-query, the lock is never released.
## Remember
- Cache stampedes occur when hot keys expire, causing simultaneous concurrent queries to overwhelm databases.
- Use distributed mutex locks (`SET NX`) so only one thread recomputes the expired cache entry.
- Apply jitter to TTLs and explore probabilistic early expiration to refresh hot data before it expires.
