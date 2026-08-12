---
id: lesson-16
slug: rate-limiting-and-api-gateways
title: "Rate Limiting & API Gateways"
level: intermediate
order: 16
duration: 26
tags:
  - rate-limiting
  - api-gateway
  - token-bucket
  - throttling
  - resilience
---

# Learning Objectives

By the end of this lesson you will be able to:

- Explain why systems **rate limit** and what it protects against.
- Compare the main algorithms: **fixed window**, **sliding window**, **token bucket**, **leaky bucket**.
- Return the right response when a client is limited (**429**, `Retry-After`).
- Describe what an **API gateway** does and where it sits.
- Reason about doing rate limiting correctly across many servers.

# Why It Matters

Any open endpoint will eventually be hit too hard — by a buggy client in a retry loop, a
scraper, an abuser, or just success. **Rate limiting** caps how much any one caller can do,
protecting your system from overload and abuse and keeping it fair. The **API gateway** is
the front door where limiting (and much else) is naturally enforced. Together they're the
protective shell around your services.

# Concept Explanation

### Why rate limit

- **Protect capacity** — stop one caller from consuming resources everyone shares.
- **Prevent abuse** — throttle scrapers, brute-force attempts, and denial-of-service
  traffic.
- **Ensure fairness** — give every user a reasonable share.
- **Control cost** — cap expensive operations (and, for paid APIs, enforce plan tiers).

When a client exceeds its limit, you **throttle** it: reject or delay the extra requests.

### The algorithms

There are four classic approaches. The first two count requests in time windows; the last
two model a flow rate.

- **Fixed window** — count requests per fixed window (e.g. 100 per minute); reset the
  counter each minute. Simple, but has a **boundary burst** problem: a client can send 100
  at 11:00:59 and 100 more at 11:01:00 — 200 in two seconds — because the window reset
  between them.
- **Sliding window** — smooth out the boundary problem by considering a rolling window. A
  **sliding-window log** stores each request's timestamp (precise but memory-heavy); a
  **sliding-window counter** blends the previous and current window counts (a good, cheap
  approximation).
- **Token bucket** — a bucket holds up to **N tokens** and refills at a steady rate. Each
  request removes a token; if the bucket is empty, the request is limited. This allows
  short **bursts** (up to the bucket size) while enforcing a steady average rate — which is
  why it's the most widely used.
- **Leaky bucket** — requests enter a queue (the bucket) and are processed ("leak out") at
  a fixed rate. It **smooths** bursts into a constant output stream, at the cost of queuing
  delay.

```text
  Token bucket:  tokens refill at R/sec, up to capacity B
    request -> token available? take it and proceed : reject (limited)
    -> allows bursts up to B, steady long-run rate R
```

### Responding to a limited client

When you throttle, tell the client clearly. The standard HTTP response is **429 Too Many
Requests**, ideally with a **`Retry-After`** header saying when to try again. Well-behaved
clients then back off (Lesson 15) instead of hammering.

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 30
```

### The API gateway

An **API gateway** is a single entry point that sits in front of your backend services and
handles **cross-cutting concerns** so each service doesn't have to:

```text
   Clients --> [ API Gateway ] --> Service A
                    |          --> Service B
                    |          --> Service C
       (auth, rate limiting, routing, TLS, aggregation, logging)
```

Common gateway responsibilities:

- **Routing** requests to the right backend service.
- **Authentication and authorization** (verify tokens once, at the edge).
- **Rate limiting and throttling** (the natural place to enforce it).
- **TLS termination**, request/response transformation, and sometimes **aggregation**
  (combining several service calls into one response).
- **Observability** — centralized logging and metrics.

The trade-offs: a gateway adds a network **hop** and can become a **bottleneck** or a
**single point of failure** — so it must be scaled out and made redundant like any critical
tier. It also risks becoming a dumping ground for business logic that belongs in services;
keep it to cross-cutting concerns.

### Rate limiting across many servers

If your limit is "100 requests/minute per user" but you run 10 gateway instances, each
can't just count locally — a user could do 100 on *each* instance (1,000 total). Correct
distributed rate limiting needs a **shared counter** (commonly in a fast store like Redis)
that all instances update, so the limit is enforced globally. That shared state is the
main challenge of doing it right at scale.

# Key Terminology

- **Rate limiting** — capping how many requests a client may make in a time window.
- **Throttling** — rejecting or delaying requests that exceed the limit.
- **Fixed / sliding window** — window-counting limit algorithms.
- **Token bucket** — refilling tokens allow bursts up to a capacity, steady average rate.
- **Leaky bucket** — a queue drained at a fixed rate, smoothing bursts.
- **429 Too Many Requests** — the HTTP status for a rate-limited request.
- **API gateway** — a single entry point handling routing, auth, limiting, and other
  cross-cutting concerns.
- **Distributed rate limiting** — enforcing a limit across many servers via shared state.

# Options and Trade-offs

| Algorithm | Allows bursts? | Accuracy | Cost |
| --------- | -------------- | -------- | ---- |
| Fixed window | Yes (boundary burst) | Low (edge problem) | Very cheap |
| Sliding window log | No | High | Memory-heavy |
| Sliding window counter | Slightly | Good approximation | Cheap |
| Token bucket | Yes, up to bucket size | Good | Cheap |
| Leaky bucket | No (smooths) | Steady output | Adds queuing delay |

# Worked Example

A public API must enforce **100 requests/minute per API key** and stay fair under a client
that occasionally bursts. Use a **token bucket** at the **API gateway**, with a shared
counter in Redis.

```text
  Per key: bucket capacity 100, refill 100 tokens/minute (~1.67/sec)
  request arrives at the gateway:
    tokens = redis.decr(bucket for key)   # atomic, shared across gateway instances
    if tokens >= 0: forward to backend
    else:           return 429 with Retry-After
```

- **Bursts are allowed** up to 100 (the bucket size), so a client that was quiet can spike
  briefly — good UX — while the long-run rate stays at 100/minute.
- **The counter is shared** in Redis, so all gateway instances enforce one global limit,
  not one-per-instance.
- **Throttled requests get 429 + Retry-After**, so well-behaved clients back off instead of
  retrying blindly.

The gateway also authenticates the key and routes the allowed requests onward — one front
door doing auth, limiting, and routing together.

# Real World Analogy

A **token bucket** is like a prepaid arcade: you're handed tokens at a steady trickle, up to
a pocketful (the bucket). You can spend a burst of tokens on several games at once, but once
your pocket's empty you wait for more to trickle in. A **leaky bucket** is the single-file
turnstile at the exit: no matter how big the crowd, people pass through at a fixed, steady
rate. An **API gateway** is the building's front desk: it checks everyone's ID
(authentication), enforces the "one at a time" rule (rate limiting), and directs each
visitor to the right department (routing).

# Examples

## Example 1 — Basic: fixed window's boundary burst

An API allows 100/minute with a fixed window. A client sends 100 requests at 10:00:59 and
100 more at 10:01:00 — 200 requests in about a second — because the counter reset at the
minute boundary.

**Why this bites (and the fix):** fixed windows permit double the rate across a boundary; a
sliding window or token bucket smooths it out.

## Example 2 — Real-world: tiered limits at the gateway

A SaaS gives free users 60 requests/minute and paid users 6,000. The API gateway looks up
the plan from the API key and applies the matching token bucket — enforcing business tiers
without any service knowing about it.

**Why this works:** the gateway is the one place that sees every request, so plan
enforcement lives there cleanly.

## Example 3 — Trade-off / pitfall: per-instance limits

A team runs 8 gateway instances, each counting locally with "100/minute." A user quietly
gets 800/minute because each instance counts separately.

**Why this bites:** a global limit needs shared state. Move the counter to a shared store
so all instances enforce one limit together.

# Common Mistakes

- **Fixed windows for strict limits.** The boundary burst lets clients briefly double the
  rate; use sliding window or token bucket.
- **Per-instance counters for a global limit.** Without shared state, N instances allow N×
  the intended rate.
- **Silent throttling.** Return **429** with **`Retry-After`** so clients know to back off.
- **Making the gateway a SPOF or a monolith.** Scale it out, and keep business logic in
  services, not the gateway.
- **Only limiting by IP.** Shared IPs (NAT, proxies) punish many users for one; prefer per
  user/API key where possible.

# Best Practices

- **Choose token bucket** for a good default: allows bursts, enforces a steady average.
- **Enforce limits at the API gateway/edge**, per user or API key.
- **Use shared state** (e.g. Redis) so limits are global across instances.
- **Respond with 429 + `Retry-After`** and document limits so clients can behave.
- **Keep the gateway focused** on cross-cutting concerns, redundant, and horizontally
  scaled.

# Summary

- **Rate limiting** protects capacity, prevents abuse, ensures fairness, and controls cost;
  exceeding a limit means the client is **throttled**.
- **Fixed window** is simple but bursts at boundaries; **sliding window** smooths that;
  **token bucket** allows bursts up to a capacity with a steady average; **leaky bucket**
  smooths bursts into a constant rate.
- Throttled clients should get **429 Too Many Requests** with **`Retry-After`**.
- An **API gateway** is the single entry point for routing, auth, rate limiting, TLS, and
  observability — keep it redundant and focused on cross-cutting concerns.
- **Distributed rate limiting** needs **shared state** so many servers enforce one global
  limit.

# Flash Cards

Q: Why is the token bucket algorithm so widely used?
A: It allows short bursts (up to the bucket's capacity) while enforcing a steady long-run rate, giving good UX and protection at once.

Q: What is the boundary-burst problem with fixed-window rate limiting?
A: A client can send a full window's worth of requests just before the window resets and another full window just after — briefly doubling the intended rate.

Q: What HTTP response should a rate-limited request receive?
A: 429 Too Many Requests, ideally with a Retry-After header telling the client when to try again.

Q: What does an API gateway do?
A: It's a single entry point handling cross-cutting concerns: routing to services, authentication/authorization, rate limiting, TLS termination, sometimes aggregation, and centralized logging/metrics.

Q: Why do you need shared state for distributed rate limiting?
A: If each of N server instances counts locally, a user could hit each instance up to the limit and get N times the intended rate. A shared counter enforces one global limit.

Q: How does a leaky bucket differ from a token bucket?
A: A leaky bucket queues requests and processes them at a fixed rate (smoothing bursts into a steady stream), whereas a token bucket allows bursts up to its capacity.

# Exercises

### Easy
An API allows 10 requests/second. Using a token bucket with capacity 10 refilling at
10/second, describe what happens when a client sends 25 requests instantly, then nothing
for two seconds.

### Medium
Explain why running rate limiting on each of 5 gateway instances with a local counter fails
to enforce a global "600/minute per user" limit, and how you'd fix it.

### Challenging
Design rate limiting for a public API with free and paid tiers. Choose an algorithm, decide
what you key limits on (IP vs API key), where you store counters, what response you send when
limited, and how the gateway stays highly available. State the trade-offs.

# Further Reading

- MDN Web Docs — "429 Too Many Requests" and the `Retry-After` header:
  https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429
- NGINX documentation — "Rate Limiting with NGINX" (leaky/token-bucket style limiting):
  https://docs.nginx.com/
