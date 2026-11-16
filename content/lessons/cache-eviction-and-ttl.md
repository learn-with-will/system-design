---
slug: cache-eviction-and-ttl
title: "Cache Eviction & TTL"
topic: storage-and-caching
kind: technique
summary: "Manage finite cache memory: LRU, LFU, FIFO eviction policies and Time-To-Live expiration strategies."
tags: [caching, eviction, lru, lfu, ttl]
related: [caching-fundamentals-and-tiers, cache-invalidation-and-stampedes, estimating-storage-and-memory]
---
> **In one line:** Cache eviction policies reclaim memory when caches fill up, while TTLs ensure stale data is automatically purged.

## The idea
In-memory caches operate on finite hardware RAM. Because storage is bounded, a cache cannot grow indefinitely. System designers must configure two distinct mechanisms to manage memory lifecycle: expiration (TTL) and eviction policies.

**Time-To-Live (TTL):**
A TTL sets an explicit lifetime on a cached item (e.g., `EX 3600` for 1 hour). Once the TTL expires, the key is considered dead and will not be returned to clients. Redis purges expired keys using two methods:
1. *Passive expiration:* When a client attempts to read a key, Redis checks its expiration timestamp; if expired, it deletes the key and returns null.
2. *Active expiration:* Periodically, background threads sample random keys with TTLs and purge expired entries to reclaim memory.

**Eviction Policies:**
When memory fills to capacity (`maxmemory`) and new items are written, the cache must evict existing keys to make room. The policy determines which keys are purged:
- **LRU (Least Recently Used):** Discards the items that have not been accessed for the longest time. Highly effective for general workloads where recently accessed data is most likely to be requested again.
- **LFU (Least Frequently Used):** Tracks access counters and discards items accessed least frequently. Ideal for separating consistently popular long-tail items from temporary viral spikes.
- **FIFO (First In, First Out):** Discards keys strictly in the chronological order they were inserted, regardless of access frequency.
- **Random:** Evicts keys randomly. Low CPU overhead, but degrades cache hit ratio.

## See it
Compare how LRU and LFU handle differing access histories:

| Eviction Policy | Mechanism | Strengths | Vulnerability |
|---|---|---|---|
| **LRU** | Tracks last access timestamp | Adapts quickly to shifting access trends | A full-table batch scan purges all hot items |
| **LFU** | Tracks access frequency counter | Protects consistently popular long-tail keys | Historical hot keys can remain stuck in cache |
| **FIFO** | Tracks insertion timestamp | Minimal CPU overhead; simple queue | Evicts hot items simply because they are old |
| **noeviction** | Rejects writes when memory is full | Strict safety for critical in-memory stores | Fails application writes with out-of-memory errors |

```text
LRU Cache Eviction Simulation (Capacity: 3 items):
Action: Access [A] -> Cache: [A]
Action: Access [B] -> Cache: [B, A]
Action: Access [C] -> Cache: [C, B, A]
Action: Access [A] -> Cache: [A, C, B] (A promoted to head!)
Action: Insert [D] -> Cache: [D, A, C] (B evicted: least recently used!)
```

```bash
# Configuring Redis eviction policy in redis.conf
maxmemory 4gb
maxmemory-policy allkeys-lru

# Verifying evicted keys via CLI
redis-cli info stats | grep evicted_keys
# Output: evicted_keys: 184209
```

> **Tip:** If your cache also stores non-expiring session keys, use `volatile-lru` instead of `allkeys-lru`. `volatile-lru` only evicts keys that have an explicit TTL set, protecting permanent session state from eviction.

## Go deeper
Implementing true $O(1)$ LRU requires a doubly linked list combined with a hash table. However, maintaining pointers in memory for millions of keys incurs substantial memory overhead. Redis uses **Approximated LRU**: it samples 5 random keys (configurable via `maxmemory-samples`) and evicts the oldest key among the sample. Mathematically, this achieves 99% of true LRU efficiency with zero extra pointer overhead.
## Watch out
- Do not set identical TTLs on millions of keys created in batch (e.g., at midnight); they will expire at the same second, triggering a massive database query spike.
- Add random jitter to TTLs (e.g., `TTL = 3600 + random(0, 300)`) to spread cache expirations evenly across time.
## Remember
- TTLs govern time-based staleness; eviction policies reclaim memory when cache limits are reached.
- LRU evicts least recently accessed items; LFU evicts least frequently accessed items.
- Add random jitter to TTL values to prevent coordinated bulk expirations.
