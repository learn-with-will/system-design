---
slug: exponential-backoff-and-jitter
title: "Exponential Backoff & Jitter"
topic: distributed-reliability
kind: technique
summary: "Prevent self-inflicted retry storms by doubling wait times and adding full randomized jitter."
tags: [retries, exponential-backoff, jitter, resilience]
related: [timeout-strategies, idempotency-keys, circuit-breaker-pattern]
---
> **In one line:** Exponential backoff doubles retry wait intervals to give recovering services breathing room, while randomized jitter prevents synchronized retry storms.

## The idea
When a network call fails due to a transient hiccup (such as a brief packet drop or an auto-scaling container boot), retrying the request is a standard recovery mechanism. However, **how** you retry determines whether the system heals or collapses under self-inflicted load.

If thousands of mobile clients encounter a brief database glitch and immediately retry on a tight loop (e.g., retrying every 100 milliseconds), the result is a catastrophic **Retry Storm (Thundering Herd)**. The recovering database, already struggling at 100% CPU capacity, is suddenly slammed with 10x its normal traffic volume, ensuring it never recovers.

To build resilient systems, retries must employ two mathematical techniques:

1. **Exponential Backoff:**
   Instead of retrying at a constant rate, double the wait interval after each consecutive failure:
   $$\text{Sleep} = \text{Base} \times 2^{\text{attempt}}$$
   For example, with a base of 100 ms: Attempt 1 sleeps 100 ms, Attempt 2 sleeps 200 ms, Attempt 3 sleeps 400 ms, Attempt 4 sleeps 800 ms, up to a configured maximum cap (e.g., 10 seconds). This aggressively reduces retry frequency, giving the recovering backend breathing room.

2. **Randomized Jitter:**
   Even with exponential backoff, if 10,000 clients fail at the exact same moment (e.g., when a network switch reboots), all 10,000 clients will sleep for exactly 100 ms, retry in a synchronized wave, fail again, sleep for exactly 200 ms, and retry in another synchronized wave. Adding **Full Jitter** randomizes the sleep interval:
   $$\text{Sleep} = \text{random}(0, \min(\text{MaxCap}, \text{Base} \times 2^{\text{attempt}}))$$
   Jitter spreads the retries smoothly and evenly across the entire time continuum, eliminating wave spikes completely.

## See it
Compare retry traffic patterns with and without jitter:

```flow
fail: 10,000 Clients Encounter Outage at T0 @neutral
no-jit: Exponential Backoff WITHOUT Jitter | Synchronized traffic spikes @red
with-jit: Exponential Backoff WITH Full Jitter | Smooth, uniform distribution @green
fail -> no-jit: Retries hit at exactly 100ms, 200ms, 400ms (Waves!)
fail -> with-jit: Retries scattered randomly between 0 and 800ms
```

```javascript
// Production retry with Exponential Backoff and Full Jitter
async function retryWithJitter(operation, maxAttempts = 5, baseMs = 100, capMs = 10000) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      if (attempt === maxAttempts - 1 || !isTransientError(err)) {
        throw err; // Give up on permanent client errors (e.g. HTTP 400)
      }
      
      // Calculate exponential ceiling: min(cap, base * 2^attempt)
      const expCeiling = Math.min(capMs, baseMs * Math.pow(2, attempt));
      
      // Apply Full Jitter: random duration between 0 and expCeiling
      const sleepDuration = Math.random() * expCeiling;
      
      await new Promise(resolve => setTimeout(resolve, sleepDuration));
    }
  }
}
```

> **Tip:** Never retry non-transient client errors. If a server returns **HTTP 400 Bad Request**, **HTTP 401 Unauthorized**, or **HTTP 404 Not Found**, retrying will never succeed and merely wastes bandwidth; retry exclusively on **HTTP 429**, **HTTP 503**, and socket connection drops.

## Go deeper
Amazon Web Services published a seminal paper analyzing backoff algorithms across massive cloud fleets (*Exponential Backoff And Jitter*, Marc Brooker). Their empirical simulations proved that "Full Jitter" yields the lowest overall completion time and the lowest server load variance compared to Equal Jitter or Decorrelated Jitter.
## Watch out
- Always configure a strict maximum attempt limit (e.g., 3–5 retries); infinite retry loops will lock client threads and burn cloud bandwidth.
- Always enforce an absolute maximum sleep cap (e.g., 10 seconds) to prevent backoff intervals from ballooning to minutes.
## Remember
- Exponential backoff doubles wait times between attempts to prevent hammering struggling services.
- Full Jitter randomizes retry intervals, eliminating synchronized thundering herd spikes.
- Retry exclusively on transient network errors and 5xx/429 status codes; never retry 4xx client errors.
