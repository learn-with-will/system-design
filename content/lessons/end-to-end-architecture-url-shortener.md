---
slug: end-to-end-architecture-url-shortener
title: "End-to-End: URL Shortener (TinyURL)"
topic: system-architecture
kind: pattern
summary: "Design a complete high-scale URL shortener: Base62 tokens, range-based token servers, and edge caching."
tags: [case-study, url-shortener, system-design, base62, caching]
related: [system-design-interview-framework, identifying-read-and-write-paths, end-to-end-architecture-rate-limiter]
---
> **In one line:** A production URL shortener achieves massive read scale using Base62 integer tokens, coordinated token generation servers, and multi-tier caching.

## The idea
Designing a URL shortening service (like TinyURL or Bitly) is the classic canonical system design problem. It demonstrates capacity estimation, token generation algorithms, read/write decoupling, and aggressive caching.

**Requirements:**
- *Functional:* Given a long URL, return a unique 7-character short URL. Accessing the short link returns an HTTP 302/301 redirect to the original destination.
- *Non-Functional:* High availability, ultra-low read latency (< 10 ms redirect), 100:1 read-to-write ratio, 100M new URLs per month (1.2B/year).

**Token Generation Strategy: Base62 Encoding**
A 7-character token using alphanumeric characters (`[a-z, A-Z, 0-9]` = 62 possibilities):
$$62^7 = 3,521,614,606,208 \approx 3.5 \text{ Trillion unique URLs}$$
At 1.2 billion URLs per year, a 7-character Base62 string provides enough unique tokens to operate for over 2,500 years!

**How to Generate Unique Tokens without Race Conditions?**
1. *Hashing MD5/SHA256:* Hashing the long URL and taking the first 7 characters causes hash collisions that require database lookup loops.
2. *Centralized Counter with Base62:* Maintain an auto-incrementing 64-bit integer counter. Converting integer `100,000,000` to Base62 produces `"6laze"`. Zero collisions!
3. *Token Generation Service (Range Servers):* To prevent a single counter database from becoming a bottleneck, deploy a **Token Generation Service** using ZooKeeper/etcd. ZooKeeper allocates non-overlapping integer ranges to application servers:
   - Server 1 gets range `[1,000,000 to 1,999,999]`
   - Server 2 gets range `[2,000,000 to 2,999,999]`
   Each server increments its local range in memory without any cross-server coordination!

## See it
Trace the complete end-to-end architecture of the URL shortener:

```flow
client: Web & Mobile Client @neutral
edge: Edge CDN | Caches viral redirects @blue
redirect: HTTP 302 Redirect | Location: target long URL @green
lb: Layer 7 Load Balancer @primary
app: URL Shortener API @green
cache: Redis Cache Cluster | LRU Hot URLs @green
db: Distributed Database | Sharded by short code @blue
client -> edge: GET /7aB9xQ
edge -> redirect: Cache HIT (6ms)
edge -> lb: Cache MISS forward
lb -> app: Route read request
app -> cache: Check Redis cache
app -> db: Query database on miss
```

```sql
-- Schema for URL mapping
CREATE TABLE url_mappings (
  short_code VARCHAR(7) PRIMARY KEY,
  long_url VARCHAR(2048) NOT NULL,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Index on short_code is automatically created by PRIMARY KEY B-Tree
```

```http
// Redirect Response: HTTP 302 vs 301
HTTP/1.1 302 Found
Location: https://www.example.com/very/long/destination/url
Cache-Control: private, max-age=300
```

> **Tip:** Use **HTTP 302 Found** (temporary redirect) instead of HTTP 301 Moved Permanently if you need to track analytics and click counts on every redirect; browsers cache 301 redirects permanently and bypass the server on subsequent clicks.

## Go deeper
With a 100:1 read-to-write ratio, 80% of redirect requests will target the top 20% most popular short links (Pareto Principle). Caching the top 20% of daily active URLs in a Redis cluster ensures that 95%+ of redirect requests are served directly from in-memory RAM with sub-millisecond latency.
## Watch out
- Never generate short tokens by hashing long URLs without collision handling; identical long URLs will collide or require expensive database duplicate checks.
- Remember that if an application server holding an integer range crashes, unallocated IDs in its range are lost; this creates harmless tiny gaps in the counter sequence.
## Remember
- A 7-character Base62 token ($62^7$) yields over 3.5 trillion unique combinations.
- Token range coordinators (etcd/ZooKeeper) assign non-overlapping ID blocks for lock-free generation.
- Use HTTP 302 for analytical tracking; cache hot redirects aggressively in Redis and Edge CDNs.
