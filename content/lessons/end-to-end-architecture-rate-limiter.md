---
slug: end-to-end-architecture-rate-limiter
title: "End-to-End: Distributed Rate Limiter"
topic: system-architecture
kind: pattern
summary: "Design an enterprise distributed rate limiting service handling 1M+ QPS across multi-region edge gateways."
tags: [case-study, rate-limiter, system-design, redis, security]
related: [system-design-interview-framework, rate-limiting-fundamentals, distributed-rate-limiting]
---
> **In one line:** A distributed rate limiter uses atomic Redis Lua scripts, sliding window counters, and local memory batching to throttle millions of requests per second.

## The idea
Designing a centralized, distributed rate limiter is a standard senior system design interview problem. It evaluates distributed caching, race conditions, edge computing, and high-availability failure modes.

**Requirements:**
- *Functional:* Limit clients based on IP, API key, or User ID (e.g., 100 req/min). Return HTTP 429 when quota is exceeded with `Retry-After` headers.
- *Non-Functional:* Ultra-low latency (< 1–2 ms overhead added to API calls), high scalability (supporting 1,000,000+ total cluster QPS), high availability (must not become a single point of failure), and fault tolerance (fail-open behavior).

**Architecture Components:**
1. **API Gateway Interceptor:** A lightweight reverse proxy filter (Envoy/NGINX) intercepting inbound HTTP requests before routing to downstream business services.
2. **Central In-Memory Store (Redis Cluster):** Sharded Redis cluster storing sliding window counters with automatic key expiration TTLs.
3. **Atomic Evaluation via Lua Scripting:** The gateway invokes an atomic Redis Lua script executing the sliding window counter algorithm in a single network round trip, eliminating race conditions.
4. **Local Memory Token Batching (Optimization for Extreme Scale):** At 1,000,000 QPS, querying a central Redis cluster for every request saturates network links. In local batching, the API gateway acquires a **batch of tokens** (e.g., 50 tokens) from Redis at once. It enforces rate limits locally in memory for the next 50 requests, asynchronously replenishing tokens in the background!

## See it
Trace the complete distributed rate limiter architecture:

```flow
client: Client Traffic (1M QPS) @neutral
gw: API Gateway Fleet | Envoy @primary
batch: Local Token Cache | Sub-microsecond check @green
redis: Redis Cluster | Atomic Lua @blue
app: Backend Services | Protected capacity @green
reject: Reject Handler | HTTP 429 @red
client -> gw: HTTP Request
gw -> batch: Check local token budget
batch -> redis: Sync token batch asynchronously
gw -> app: Request allowed (HTTP 200)
gw -> reject: Quota exceeded (HTTP 429)
```

```lua
-- Production Redis Sliding Window Counter Lua Script
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local clearBefore = now - window

-- 1. Remove old requests outside the current sliding window
redis.call('zremrangebyscore', key, '-inf', clearBefore)

-- 2. Count current requests in sliding window
local currentRequests = redis.call('zcard', key)

if currentRequests < limit then
    -- 3. Add current timestamp to sorted set
    redis.call('zadd', key, now, now)
    redis.call('expire', key, math.ceil(window / 1000))
    return 1 -- Allowed
else
    return 0 -- Rejected (Rate limited)
end
```

> **Tip:** Always configure the gateway with a **Fail-Open circuit breaker**. If the Redis cluster suffers a catastrophic network partition, the rate limiter logs a critical alert and allows API traffic through, ensuring caching outages never take down your revenue services.

## Go deeper
Multi-tier rate limiting applies limits hierarchically:
- Tier 1 (IP Rate Limiting at WAF): 10,000 req/min to block volumetric DDoS floods.
- Tier 2 (API Key Rate Limiting at Gateway): 1,000 req/min based on customer subscription plan.
- Tier 3 (Resource-Level Limiting at Service): 5 concurrent requests on expensive PDF export endpoints.
## Watch out
- Do not perform un-batched remote Redis network calls on every single request if your API gateway processes millions of QPS; use local token batching.
- Ensure Redis keys include the tenant ID and window epoch to prevent accidental global key collisions.
## Remember
- Distributed rate limiters combine edge gateway filters with centralized Redis clusters.
- Use atomic Lua scripts to eliminate check-then-act race conditions without distributed locks.
- Implement fail-open policies so rate limiter infrastructure glitches never crash core business APIs.
