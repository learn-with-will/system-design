---
slug: distributed-rate-limiting
title: "Distributed Rate Limiting"
topic: asynchronous-systems
kind: technique
summary: "Coordinate rate limits across multi-server gateway tiers using Redis Lua scripts and atomic counters."
tags: [rate-limiting, redis, lua, distributed-systems]
related: [rate-limiting-fundamentals, fixed-and-sliding-window-algorithms, api-gateway-pattern]
---
> **In one line:** Distributed rate limiting shares client request counters across multiple gateway servers using atomic Redis Lua scripts to eliminate race conditions.

## The idea
When an architecture scales out horizontally across ten API gateway instances behind a load balancer, enforcing rate limits becomes a distributed systems challenge.

If each gateway server maintains a local in-memory counter (e.g., "Client A has made 50 requests"):
- A client can send 50 requests to Gateway 1, 50 to Gateway 2, and 50 to Gateway 3. Across the cluster, the client submits **150 requests**, even though the configured limit is 50 requests/minute!
- To enforce a global rate limit across the entire cluster, request counters must reside in a centralized, shared in-memory data store: **Redis**.

However, querying Redis introduces a dangerous **Race Condition (Check-Then-Act)**:
1. Client sends a request to Gateway A and Gateway B simultaneously.
2. Gateway A reads `GET user:42:count` -> returns 49.
3. Gateway B reads `GET user:42:count` -> returns 49.
4. Gateway A increments counter to 50 and allows the request.
5. Gateway B increments counter to 50 and allows the request!
Both requests slip through, exceeding the limit.

To prevent race conditions without slow distributed locks, distributed rate limiters execute the check and increment inside an **atomic Redis Lua script**. Redis executes Lua scripts atomically on a single thread: no other command can execute while the script runs, guaranteeing flawless thread-safe evaluation.

## See it
Compare a vulnerable check-then-act flow with an atomic Redis Lua script:

```sequence
actor g1: Gateway A
actor redis: Central Redis Cluster @primary
actor g2: Gateway B
g1 -> redis: EVALSHA rate_limit.lua (Atomic check + increment)
note redis: Script executes atomically on Redis thread
redis --> g1: Allowed: true, Remaining: 0
g2 -> redis: EVALSHA rate_limit.lua
note redis: Counter already at 50! @red
redis --> g2: Allowed: false, Remaining: 0 (HTTP 429)
```

```lua
-- Atomic Sliding Window Rate Limiter in Redis Lua
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local current = tonumber(redis.call('get', key) or "0")

if current + 1 > limit then
    return 0 -- Rejected (Exceeds limit)
else
    redis.call('incrby', key, 1)
    if current == 0 then
        redis.call('expire', key, tonumber(ARGV[2])) -- Set TTL on new key
    end
    return 1 -- Allowed
end
```

```javascript
// Node.js invoking the atomic Redis Lua rate limiter
const isAllowed = await redis.eval(
  LUA_SCRIPT,
  1,                          // 1 key
  `ratelimit:${userId}:${windowKey}`, // KEYS[1]
  100,                        // ARGV[1]: limit
  60                          // ARGV[2]: TTL in seconds
);
if (isAllowed === 0) {
  res.status(429).json({ error: 'Too Many Requests' });
}
```

> **Tip:** In massive multi-region deployments where cross-region network latency to a single Redis cluster is prohibitive, use **Local Rate Limiting with Batch Syncing**: each regional gateway enforces a local fraction of the budget and periodically synchronizes consumed tokens asynchronously.

## Go deeper
If the centralized Redis cluster becomes temporarily unreachable, what should the rate limiter do? Production systems define a **Fail-Open vs Fail-Closed** policy:
- *Fail-Open (Standard):* If Redis times out, allow the API request to proceed to avoid taking down legitimate users during caching maintenance.
- *Fail-Closed:* If Redis times out, reject requests; mandatory for security-critical endpoints (like login attempts or payment submission).
## Watch out
- Never implement distributed rate limiting by doing separate `redis.get` and `redis.set` calls from application code; concurrent requests will cause race conditions.
- Ensure Redis Lua scripts are lightweight; a slow Lua script blocks the single-threaded Redis event loop for all other operations.
## Remember
- Distributed rate limiting shares counters across multiple gateway servers using Redis.
- Atomic Redis Lua scripts eliminate check-then-act race conditions without distributed locks.
- Define explicit Fail-Open policies for general APIs to prevent caching hiccups from causing global outages.
