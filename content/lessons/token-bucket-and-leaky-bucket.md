---
slug: token-bucket-and-leaky-bucket
title: "Token Bucket & Leaky Bucket"
topic: asynchronous-systems
kind: technique
summary: "Compare burst-friendly Token Bucket with steady-output Leaky Bucket traffic shaping algorithms."
tags: [rate-limiting, token-bucket, leaky-bucket, algorithms]
related: [rate-limiting-fundamentals, fixed-and-sliding-window-algorithms, distributed-rate-limiting]
---
> **In one line:** Token Bucket allows traffic bursts up to bucket capacity; Leaky Bucket smooths traffic to a perfectly constant, steady output rate.

## The idea
When implementing rate limiting, the two classic algorithms from computer networking are the **Token Bucket** and the **Leaky Bucket**. While both control traffic flow, they handle bursts fundamentally differently.

**The Token Bucket Algorithm:**
- *Mechanism:* Imagine a bucket with a fixed capacity $B$ of tokens. A background process periodically adds tokens to the bucket at a constant refill rate $R$ (e.g., 10 tokens per second). If the bucket is full, newly added tokens overflow and are discarded. When a request arrives, it attempts to draw 1 token from the bucket.
- *Outcome:* If tokens are available, the token is consumed and the request proceeds immediately. If the bucket is empty, the request is rejected with HTTP 429.
- *Key Property:* **Allows traffic bursts.** If the system has been idle, the bucket fills to capacity $B$. A client can suddenly send a burst of $B$ requests in a single millisecond, and all will be accepted.

**The Leaky Bucket Algorithm:**
- *Mechanism:* Imagine a bucket with a small hole in the bottom that leaks water at a perfectly constant, steady rate. Requests enter the top of the bucket like incoming water (stored in a FIFO queue of capacity $B$). The system processes requests at the constant leak rate $R$.
- *Outcome:* If the bucket queue overflows, incoming requests are dropped.
- *Key Property:* **Smooths traffic to a constant rate.** Even if a client sends a massive burst, the backend receives requests at a perfectly steady, unvarying pace.

## See it
Compare Token Bucket and Leaky Bucket characteristics:

| Dimension | Token Bucket | Leaky Bucket |
|---|---|---|
| **Traffic Bursts** | **Allowed** (bursts up to bucket capacity $B$) | **Smoothed** (strictly constant output rate $R$) |
| **Data Structure** | Two numbers: `tokens_count` and `last_refill_timestamp` | FIFO Queue of bounded capacity |
| **Memory Footprint** | Extremely small ($O(1)$ per user) | Larger (must queue pending requests) |
| **Use Cases** | General web APIs, Stripe, AWS, bursty HTTP traffic | Data ingestion pipelines, video encoders, steady I/O |

```javascript
// High-performance Token Bucket in JavaScript (Zero background timers!)
class TokenBucket {
  constructor(capacity, refillRatePerSecond) {
    this.capacity = capacity;
    this.refillRate = refillRatePerSecond;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  allowRequest() {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefill) / 1000;
    
    // Lazily replenish tokens based on elapsed time
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.refillRate);
    this.lastRefill = now;

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true; // Request allowed!
    }
    return false; // Rate limited (HTTP 429)
  }
}
```

> **Tip:** Notice the lazy token calculation. You do **not** need a background `setInterval` timer adding tokens every millisecond; calculate newly earned tokens mathematically on the fly when requests arrive!

## Go deeper
Because Token Bucket requires tracking only two variables per user (current tokens and last refill timestamp), storing rate limit states for 10 million users in Redis requires less than 200 megabytes of RAM.
## Watch out
- Do not use Leaky Bucket if clients expect immediate interactive responses; queueing requests in a leaky bucket adds variable queuing latency.
- Token Bucket capacity ($B$) must not exceed your database's maximum instantaneous connection limit.
## Remember
- Token Bucket permits temporary traffic bursts up to bucket capacity; Leaky Bucket smooths output to a constant rate.
- Token Bucket is the industry standard for web and cloud APIs (AWS, Stripe).
- Implement Token Bucket lazily on request arrival using elapsed time math rather than active background timers.
