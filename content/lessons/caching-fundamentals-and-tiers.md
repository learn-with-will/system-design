---
slug: caching-fundamentals-and-tiers
title: "Caching Fundamentals & Tiers"
topic: storage-and-caching
kind: concept
summary: "Understand the multi-tier caching hierarchy from browser and CDN to application memory and distributed Redis."
tags: [caching, performance, redis, architecture]
related: [cache-read-patterns, cache-write-patterns, cache-eviction-and-ttl]
---
> **In one line:** A cache stores temporary copies of expensive-to-compute or slow-to-retrieve data in fast memory to accelerate reads and shield databases.

## The idea
Fetching data from disk or computing complex joins across relational tables takes milliseconds. Fetching data from in-memory RAM takes nanoseconds to microseconds. **Caching** exploits the principle of locality (temporal locality: data accessed recently will likely be accessed again; spatial locality: nearby data will be accessed soon) by placing high-speed storage buffers in front of slower backing stores.

In modern internet systems, caching operates across a multi-tier hierarchy:
1. **Client / Browser Cache:** The browser stores static assets, HTTP responses, and API payloads locally on the user's device, governed by `Cache-Control` and `ETag` headers. Latency: zero network hops (0 ms).
2. **Edge CDN Cache:** Points of Presence distributed globally cache static media and popular dynamic API fragments within 5–10 ms of users.
3. **API Gateway / Reverse Proxy Cache:** Proxies like NGINX or Varnish cache HTTP endpoints directly in front of the application cluster.
4. **Application In-Memory Cache:** Local process memory caches (e.g., Guava, Caffeine, in-memory hash maps) stored directly inside application server RAM. Latency: sub-microsecond, but not shared across servers.
5. **Distributed In-Memory Cache (Redis, Memcached):** A dedicated, standalone cluster of memory servers accessible by all application servers. Stores shared session state, computed search results, and database query objects. Latency: ~0.5–1 ms over local datacenter network.

The efficiency of any cache is measured by the **Cache Hit Ratio**:
$$\text{Hit Ratio} = \frac{\text{Cache Hits}}{\text{Cache Hits} + \text{Cache Misses}}$$
A cache hit ratio of 95% means that 19 out of every 20 queries are intercepted in memory, reducing load on your primary database by 95%!

## See it
Trace the multi-tier caching hierarchy from client to primary database:

```flow
client: Web Browser | Tier 1: Local Disk Cache @neutral
cdn: Edge CDN | Tier 2: Edge PoP Cache @blue
proxy: API Gateway | Tier 3: NGINX Cache @blue
app: App Server | Tier 4: In-Memory Cache @primary
redis: Redis Cluster | Tier 5: Distributed Cache @green
db: PostgreSQL DB | Source of Truth (Disk) @amber
client -> cdn: Miss: Fetch from edge
cdn -> proxy: Miss: Fetch from gateway
proxy -> app: Miss: Fetch from app
app -> redis: Check distributed cache
redis -> db: Cache MISS: Query database
```

```bash
# Inspecting Redis memory stats and hit ratio via CLI
redis-cli info stats
# Sample Output:
# keyspace_hits: 9548201
# keyspace_misses: 481204
# Cache Hit Ratio = 9548201 / (9548201 + 481204) = 95.2%
```

> **Tip:** Caching is not a replacement for good database schema design and proper indexing. If your database queries take 10 seconds without a cache, cache misses will regularly crash your application.

## Go deeper
While local application process caches provide sub-microsecond lookups, they introduce **cache coherency** problems: when Server A updates a record in its local memory, Server B still holds the old record in its local memory. Distributed caches (Redis) solve this by establishing a single, consistent shared memory tier for all application nodes.
## Watch out
- Never cache data without setting a Time-To-Live (TTL); without an expiration date, orphaned keys will leak memory until the cache crashes.
- Do not assume a high hit ratio means zero database load; during traffic spikes, even a 1% miss rate on 100,000 QPS is 1,000 queries/second hitting your database.
## Remember
- Caching stores hot data in fast memory, dramatically reducing latency and database load.
- Caching spans multiple tiers: browser, CDN, gateway, application memory, and distributed Redis.
- Cache Hit Ratio measures effectiveness; aim for 90%+ hit rates on read-heavy workloads.
