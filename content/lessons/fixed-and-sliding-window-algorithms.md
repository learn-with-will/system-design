---
slug: fixed-and-sliding-window-algorithms
title: "Fixed & Sliding Window Algorithms"
topic: asynchronous-systems
kind: technique
summary: "Analyze boundary burst bugs in fixed windows, and implement Sliding Logs and Sliding Window Counters."
tags: [rate-limiting, sliding-window, fixed-window, algorithms]
related: [rate-limiting-fundamentals, token-bucket-and-leaky-bucket, distributed-rate-limiting]
---
> **In one line:** Fixed windows suffer from boundary traffic doubling; sliding window counters calculate a weighted average of adjacent windows to ensure smooth limits.

## The idea
In time-based rate limiting (e.g., "100 requests per minute"), how you define the time window dictates the algorithm's accuracy and memory consumption.

**Fixed Window Counter:**
Divides time into fixed intervals (e.g., 12:00:00–12:01:00, 12:01:00–12:02:00) with a simple integer counter.
- *The Fatal Flaw: The Boundary Burst Bug.* Suppose the limit is 100 requests/minute. A client sends 100 requests at 12:00:59 (the end of window 1), and then sends another 100 requests at 12:01:01 (the start of window 2). Both windows observe exactly 100 requests, so both are accepted! However, within a rolling 2-second period across the boundary, the client submitted **200 requests—twice the permitted limit!**

**Sliding Window Log:**
Stores a timestamped sorted set of every request in Redis. When a request arrives, timestamps older than 60 seconds are purged, and the remaining log length is counted.
- *Pros:* 100% mathematically accurate rolling window; completely immune to boundary bursts.
- *Cons:* Heavy memory footprint; storing timestamps for millions of requests consumes gigabytes of RAM.

**Sliding Window Counter (The Hybrid Standard):**
Combines fixed window memory efficiency with sliding window accuracy by calculating a **weighted average** of the current and previous windows:
$$\text{Estimated Count} = (\text{Prev Window Count} \times (1 - \text{time elapsed in current window})) + \text{Current Window Count}$$
If the limit is 100 req/min, 30% of the current minute has elapsed, the previous window had 80 requests, and the current window has 30 requests:
$$\text{Count} = (80 \times 0.70) + 30 = 56 + 30 = 86 \le 100 \implies \text{Allowed!}$$

## See it
Compare the three windowing rate limit algorithms:

| Algorithm | Memory per User | Boundary Burst Vulnerability | Accuracy |
|---|---|---|---|
| **Fixed Window Counter** | Extremely low (1 integer) | **Severe (2x traffic burst at boundary)** | Low |
| **Sliding Window Log** | High ($O(N)$ timestamps stored) | None (perfect continuous tracking) | 100% Exact |
| **Sliding Window Counter** | Low (2 integers: current & prev) | Negligible (smooth weighted approximation) | ~99% Accurate |

```javascript
// Sliding Window Counter weighted formula calculation
function isAllowed(prevWindowCount, currentWindowCount, limit = 100) {
  const now = new Date();
  const secondsIntoCurrentMinute = now.getSeconds();
  const timeWeight = (60 - secondsIntoCurrentMinute) / 60; // Fraction of prev window remaining

  const estimatedRollingRequests = (prevWindowCount * timeWeight) + currentWindowCount;
  return estimatedRollingRequests < limit;
}

// Example at 12:01:15 (15 seconds in):
// Prev window (12:00): 100 requests
// Current window (12:01): 20 requests
// Estimated = (100 * 45/60) + 20 = 75 + 20 = 95 < 100 (Allowed!)
```

> **Tip:** The Sliding Window Counter is Cloudflare's algorithm of choice for edge rate limiting because it prevents boundary bursts while requiring only two counters per client.

## Go deeper
In high-scale deployments, the Sliding Window Counter assumes requests in the previous window were distributed uniformly. While an approximation, Cloudflare's empirical research across billions of requests demonstrated that the error rate is under 0.05%, making it the ideal production compromise between memory and accuracy.
## Watch out
- Never deploy simple fixed-window rate limiting on critical, easily saturated services; boundary bursts will double your expected load.
- Avoid Sliding Window Logs if clients send millions of requests; storing timestamp arrays in Redis will trigger out-of-memory errors.
## Remember
- Fixed window counters suffer from boundary bursts that allow 2x traffic spikes across interval edges.
- Sliding Window Logs provide exact precision but suffer high memory overhead.
- Sliding Window Counters use weighted averages to deliver near-perfect accuracy with minimal memory.
