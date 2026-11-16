---
slug: partial-failure-and-blast-radius
title: "Partial Failure & Blast Radius"
topic: distributed-reliability
kind: concept
summary: "Design for the inevitability of partial failure in distributed systems and isolate components to limit blast radius."
tags: [reliability, partial-failure, blast-radius, fault-tolerance]
related: [circuit-breaker-pattern, bulkhead-pattern, failure-domains-and-blast-radius]
---
> **In one line:** In distributed systems, partial failure is inevitable; architectures must contain faults within isolated boundaries to minimize blast radius.

## The idea
On a single monolithic computer, failure is usually binary: either the entire machine is running, or it has crashed. In a distributed system with dozens of microservices, hundreds of server nodes, and multiple cloud regions, **partial failure is the normal state of operation**.

At any given moment in a large cloud deployment:
- A network switch in one availability zone is dropping 5% of packets.
- A disk on a database replica is encountering read errors.
- A third-party SMS verification provider is suffering a major outage.
- A downstream analytics service is deadlocked by a memory leak.

**The Danger of Cascading Failure:**
If systems are not designed for partial failure, a minor fault in an auxiliary component escalates into a catastrophic, global system-wide outage. For example, if the user review service slows down, the product details service hangs waiting for reviews; the homepage service hangs waiting for product details; connection pools exhaust across the cluster; and users cannot even purchase items from their shopping carts!

**Limiting Blast Radius:**
**Blast radius** refers to the maximum scope of damage when a component fails. Resilient architectures intentionally design architectural firewalls to contain failures within the smallest possible perimeter:
1. **Fault Isolation Domains:** Decouple critical business paths (e.g., checkout and payments) from non-critical ancillary features (e.g., personalized recommendations, product reviews, and social share buttons).
2. **Defensive Programming:** If the recommendation service is unreachable, the homepage should not throw an HTTP 500; it should simply render the page with static generic products.

## See it
Consider how graceful degradation contains a partial failure within its blast radius:

```flow
gateway: Product Page Gateway | Aggregates microservices @primary
cat: Catalog Service | 20 ms @green
price: Pricing Service | 15 ms @green
rec: Recommendation Service | FAILING / TIMEOUT @red
page: Rendered Web Page | Complete with fallback @blue
gateway -> cat: Fetch title & image (OK)
gateway -> price: Fetch price (OK)
gateway -> rec: 200ms timeout
cat -> page: Include catalog data
price -> page: Include pricing data
gateway -> page: Render page with fallback
```

```json
// Resilient API response with graceful partial degradation
{
  "product_id": "prod_491",
  "title": "Ergonomic Mechanical Keyboard",
  "price_usd": 129.99,
  "in_stock": true,
  "recommendations": {
    "status": "degraded_fallback",
    "items": ["prod_default_1", "prod_default_2"]
  }
}
```

> **Tip:** The primary shopping journey (adding to cart, purchasing) remains 100% operational, even though the personalized AI recommendation service is completely dead.

## Go deeper
Amazon organizes critical services into **Tier 1 (Customer-Critical)** and **Tier 2 (Non-Critical)**. A Tier 1 service is strictly prohibited from having synchronous dependencies on any Tier 2 service. If a dependency on a Tier 2 service is necessary, it must be completely asynchronous via message queues or wrapped in an aggressive timeout with an immediate fallback.
## Watch out
- Never allow a non-critical feature (like live chat widgets or review counts) to sit in the synchronous blocking path of your core revenue checkout flow.
- Ensure unhandled errors in async background threads do not crash the main application process.
## Remember
- Partial failure is an everyday reality in distributed systems, not an exceptional edge case.
- Blast radius must be minimized by decoupling critical revenue paths from auxiliary services.
- Implement graceful degradation: fail non-critical components to static fallbacks rather than crashing user pages.
