---
slug: content-delivery-networks
title: "Content Delivery Networks (CDNs)"
topic: networking-and-apis
kind: tool
summary: "Accelerate static assets and dynamic APIs using geographically distributed Edge PoPs, Anycast, and origin shielding."
tags: [cdn, caching, edge, networking]
related: [dns-resolution, caching-fundamentals-and-tiers, cache-eviction-and-ttl]
---
> **In one line:** A CDN is a geographically distributed network of proxy edge servers that caches assets close to users to slash latency and origin load.

## The idea
If your primary application servers reside in a single datacenter in Virginia, a user accessing the service from Sydney, Australia faces a physical speed-of-light propagation delay of ~200 milliseconds per network round trip. A web page requiring ten sequential asset fetches takes seconds simply traversing ocean cables.

A **Content Delivery Network (CDN)** solves this geographic penalty. A CDN consists of hundreds of **Points of Presence (PoPs)** distributed in major internet exchange points worldwide. When a user requests an asset, Anycast DNS routes their connection to the physically closest edge server (often within 5–10 milliseconds of their home). If the edge server has the asset cached, it responds immediately, completely bypassing the origin server.

Modern CDNs handle two distinct types of traffic:
1. **Static Content Delivery:** Images, CSS, compiled JavaScript bundles, video segments, and downloadable files. These assets carry long cache lifetimes (e.g., 1 year) and achieve cache hit ratios exceeding 95%.
2. **Dynamic Content Acceleration:** API responses, authenticated content, and search queries that cannot be cached. CDNs accelerate dynamic requests by terminating TCP and TLS handshakes at the edge PoP, then routing requests to the origin over optimized, pre-warmed internal backbone fiber connections.

## See it
Consider how an edge PoP intercepts and shields the origin server:

```sequence
actor user: Global User | Tokyo @neutral
actor edge: CDN Edge PoP | Tokyo @green
actor origin: Origin Server | Virginia @amber
user -> edge: GET /assets/app.js
edge --> user: 200 OK | Cache HIT (6ms)
user -> edge: GET /api/user/profile
edge -> origin: Forward Cache MISS
origin --> edge: 200 OK | Fresh profile
edge --> user: 200 OK | Dynamic response
```

```http
// HTTP response headers from a modern CDN Edge PoP
HTTP/2 200 OK
content-type: image/avif
content-length: 42180
cache-control: public, max-age=31536000, immutable
cf-cache-status: HIT
age: 86400
server: cloudflare
x-served-by: cache-tyo19920-TYO
```

> **Tip:** Adding an **Origin Shield**—a centralized caching proxy tier between distributed edge PoPs and your origin—prevents thousands of edge servers from stampeding your origin simultaneously when an asset expires.

## Go deeper
Edge computing platforms (Cloudflare Workers, Fastly Compute, AWS CloudFront Functions) allow developers to execute lightweight serverless JavaScript or WebAssembly directly inside CDN edge PoPs. This enables edge authentication, A/B testing, header rewrites, and localized redirects to execute in under 10 milliseconds without touching origin infrastructure.
## Watch out
- Always append a content hash to static asset filenames (e.g., `bundle.a8b1c2.js`) so you can set a 1-year cache header safely.
- Watch out for stale cache issues on dynamic APIs; ensure invalidation webhooks or low TTLs are strictly configured.
## Remember
- CDNs terminate connections and serve cached content from edge servers close to end users.
- Edge caching slashes latency and absorbs up to 95% of bandwidth load off origin servers.
- Use content hashing on filenames to combine aggressive one-year caching with instantaneous cache busting on deploys.
