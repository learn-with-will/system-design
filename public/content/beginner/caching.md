---
id: lesson-07
slug: caching
title: "Caching"
level: beginner
order: 7
duration: 26
tags:
  - caching
  - performance
  - invalidation
  - eviction
  - cdn
---

# Learning Objectives

By the end of this lesson you will be able to:

- Explain what a cache is and where caches live in a system.
- Compare the main **caching patterns** (cache-aside, read-through, write-through, write-back).
- Describe **eviction** policies (LRU, LFU) and **TTL**.
- Explain why **cache invalidation** is hard and how to handle staleness.
- Recognize and prevent a **cache stampede**.

# Why It Matters

Caching is the single highest-leverage performance tool in system design. A cache keeps
frequently used data in a fast place (usually memory) so you don't recompute it or fetch
it from a slow database every time. It cuts latency and takes load off your backend — but
it also introduces the possibility of serving **stale** data, which is why "there are
only two hard things in computer science: cache invalidation and naming things" (Phil
Karlton) is a famous joke among engineers.

# Concept Explanation

### What a cache is, and where they live

A **cache** is a fast store of copies of data that is expensive to fetch or compute.
Caches appear at every layer of a system:

```text
  Browser cache --> CDN edge cache --> Load balancer --> App in-memory cache
                                                              |
                                                    Distributed cache (Redis)
                                                              |
                                                     Database (its own buffer cache)
```

The closer a cache is to the user, the more latency it saves — but the more copies there
are to keep in sync.

### Read caching patterns

**Cache-aside (lazy loading)** — the most common. The application manages the cache: on a
read, it checks the cache; on a **miss**, it reads the database, stores the result in the
cache, and returns it.

```text
  read(key):
    value = cache.get(key)
    if value is None:          # cache miss
        value = db.get(key)
        cache.set(key, value)  # populate for next time
    return value
```

**Read-through** — the cache itself knows how to load from the database on a miss, so the
application just asks the cache. Similar effect, but the loading logic lives in the cache
layer.

### Write caching patterns

When data changes, the cache and database can get out of sync. The write pattern decides
how you handle that:

| Pattern | On a write | Strength | Watch out for |
| ------- | ---------- | -------- | ------------- |
| Write-through | Write cache **and** database synchronously | Cache never stale for that key | Slower writes (two hops) |
| Write-back (write-behind) | Write cache now, flush to DB **later** | Very fast writes | Data loss if cache dies before flush |
| Write-around | Write DB directly, skip cache | Avoids caching write-only data | First read is a miss |

### Eviction and TTL

A cache has limited memory, so it must decide what to drop:

- **LRU (Least Recently Used)** — evict the entry unused for the longest time. The common
  default; good when recent data is likely to be reused.
- **LFU (Least Frequently Used)** — evict the least-often-used entry. Good when some items
  are perennially popular.
- **FIFO** — evict the oldest inserted. Simple, but ignores usage.
- **TTL (time-to-live)** — every entry also expires after a set time, regardless of usage,
  so stale data eventually leaves.

### Invalidation and staleness

Keeping cached copies correct when the source changes is **cache invalidation**, and it's
genuinely hard because there can be many copies at many layers. The main tools:

- **TTL** — accept staleness up to a bounded time; simple and robust.
- **Explicit invalidation** — delete/update the cache entry when the data changes
  (precise, but you must catch every write path).
- **Write-through** — keep the cache fresh on every write (costs write latency).

Choosing how much staleness you can tolerate is a design decision, measured by the
**cache hit ratio** (fraction of reads served from cache) you achieve versus the
freshness you need.

### Cache stampede (thundering herd)

If a popular key expires and a thousand requests miss at the same instant, they all hit
the database at once — a **cache stampede** that can overload the backend. Defenses:
serve slightly stale data while one request refreshes, **coalesce** duplicate requests so
only one recomputes, add small **random jitter** to TTLs so keys don't all expire
together, or pre-warm hot keys.

# Key Terminology

- **Cache** — a fast store of copies of expensive-to-fetch data.
- **Hit / miss** — the data was (hit) or wasn't (miss) in the cache.
- **Cache-aside** — the app checks the cache and populates it on a miss.
- **Write-through / write-back / write-around** — strategies for keeping cache and DB in
  sync on writes.
- **Eviction policy** — the rule for what to drop when the cache is full (LRU, LFU, FIFO).
- **TTL** — how long an entry lives before it expires.
- **Invalidation** — removing or updating stale cache entries.
- **Hit ratio** — fraction of reads served from cache.
- **Cache stampede / thundering herd** — many simultaneous misses hammering the backend.

# Options and Trade-offs

| Decision | Option A | Option B | Trade-off |
| -------- | -------- | -------- | --------- |
| Read pattern | Cache-aside (app-managed) | Read-through (cache-managed) | Control vs simplicity |
| Freshness | Long TTL | Short TTL / explicit invalidation | Higher hit ratio vs less staleness |
| Write handling | Write-through (fresh) | Write-back (fast) | Consistency vs write speed |
| Eviction | LRU | LFU | Favor recent vs favor popular |

# Worked Example

A product page reads a product from the database on every view. At high traffic the
database is the bottleneck. Add a **cache-aside** layer with a TTL.

```text
  GET /product/42
    -> cache.get("product:42")
       hit  -> return in ~1 ms (from memory)
       miss -> db.get(42) (~10 ms), cache.set("product:42", value, ttl=60s), return
```

If 95% of reads hit the cache, the database now sees only 5% of the traffic, and most
users get a ~1 ms response instead of ~10 ms. But there's a catch: an edit to product 42
won't show for up to 60 seconds (the TTL). If that's unacceptable, add **explicit
invalidation** — delete `product:42` from the cache whenever the product is updated — so
edits appear immediately while reads stay fast.

```text
  update product 42 -> write DB -> cache.delete("product:42")
  next read repopulates the cache with fresh data
```

We traded a little complexity (invalidating on write) for both speed *and* freshness.

# Real World Analogy

A cache is like keeping frequently used items on your desk instead of walking to the
storeroom (the database) each time. **LRU** eviction is clearing the item you haven't
touched in ages when the desk gets full. A **TTL** is a sticky note that says "throw this
out after an hour" so you don't rely on outdated information. **Invalidation** is the
hard part: if the master copy in the storeroom changes, you must remember to replace the
one on your desk — forget, and you act on stale information.

# Examples

## Example 1 — Basic: caching an expensive computation

A dashboard runs a heavy aggregation query that takes 2 seconds. Caching the result for
5 minutes means only one user every 5 minutes waits 2 seconds; everyone else gets it
instantly.

**Why this works:** the data changes slowly, so a short TTL yields a huge speedup with
acceptable staleness.

## Example 2 — Real-world: a CDN as an edge cache

Static assets (images, scripts) are cached at CDN edges near users. A first request in a
region populates the edge; subsequent users in that region are served locally in
milliseconds, and the origin barely sees the traffic.

**Why this works:** the CDN is a cache close to users, saving both latency and origin
load — caching applied at the network edge.

## Example 3 — Trade-off / pitfall: a cache stampede

A viral item's cache entry expires at midnight. Ten thousand requests miss simultaneously
and all query the database, which falls over.

**Why this bites:** synchronized expiry turns a hot key into a backend flood. Add TTL
jitter and request coalescing so only one request refreshes while others wait or serve
slightly stale data.

# Common Mistakes

- **Caching without an invalidation plan.** Decide up front how stale data leaves (TTL,
  explicit deletes, write-through).
- **One TTL for everything.** Different data tolerates different staleness; tune per use
  case, and add jitter to avoid synchronized expiry.
- **Caching write-heavy or rarely-reused data.** Caches pay off for read-heavy, reusable
  data; caching everything wastes memory and adds staleness risk.
- **Ignoring the cold-cache problem.** Right after a restart or deploy, the cache is empty
  and the backend takes full load — warm hot keys if that matters.
- **Assuming the cache is always available.** Design so a cache outage degrades to slower
  responses, not a total outage.

# Best Practices

- **Cache read-heavy, reusable data** and measure your **hit ratio**.
- **Choose a freshness strategy explicitly**: TTL, explicit invalidation, or
  write-through, based on how much staleness you can accept.
- **Add jitter to TTLs** and **coalesce** duplicate misses to prevent stampedes.
- **Pick eviction to your access pattern** (LRU for recency, LFU for enduring
  popularity).
- **Fail open**: if the cache is down, fall back to the source rather than erroring.

# Summary

- A **cache** stores copies of expensive data in a fast place to cut latency and backend
  load; caches exist at every layer, from the browser to the CDN to the database.
- **Cache-aside** is the common read pattern; **write-through / write-back /
  write-around** decide how writes keep cache and DB in sync.
- **Eviction** (LRU/LFU/FIFO) frees space; **TTL** bounds staleness.
- **Invalidation** is the hard problem — choose TTL, explicit deletes, or write-through
  by how much staleness you can tolerate.
- Prevent **cache stampedes** with TTL jitter, request coalescing, and serving slightly
  stale data during refresh.

# Flash Cards

Q: How does the cache-aside pattern handle a cache miss?
A: The application reads from the database, stores the result in the cache, and returns it — so the next read is a hit.

Q: What is the difference between write-through and write-back caching?
A: Write-through writes to the cache and database synchronously (fresh but slower); write-back writes to the cache and flushes to the database later (fast but risks loss if the cache dies first).

Q: What does an LRU eviction policy do?
A: It evicts the entry that has gone unused the longest, keeping recently used data in the cache.

Q: Why is cache invalidation considered hard?
A: Because data can be copied across many caches and layers, and every write path must correctly update or remove the stale copies — miss one and you serve wrong data.

Q: What is a cache stampede, and how do you prevent it?
A: Many requests missing the same expired key at once, all hitting the backend. Prevent it with TTL jitter, request coalescing, and serving slightly stale data while one request refreshes.

Q: What does the cache hit ratio measure?
A: The fraction of reads served from the cache rather than the backing store — higher means more latency and load saved.

# Exercises

### Easy
For each, choose a caching write pattern and justify it: (a) a user's shopping-cart
count shown on every page, (b) a bank balance that must never appear stale, (c) analytics
counters that can lag slightly.

### Medium
A product page uses cache-aside with a 60-second TTL. Editors complain their changes take
a minute to appear. Redesign the caching so reads stay fast *and* edits show immediately.
What did you add, and what does it cost?

### Challenging
Design caching for a home page that shows a personalized feed plus shared trending items.
Decide what to cache where (browser, CDN, app, distributed cache), the freshness strategy
for each, and how you'd prevent a stampede when a trending item's entry expires.

# Further Reading

- Martin Kleppmann, *Designing Data-Intensive Applications* — discussion of caching,
  derived data, and staleness.
- Redis documentation — https://redis.io/docs/ (eviction policies and caching patterns).
