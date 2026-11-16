---
slug: load-shedding-and-graceful-degradation
title: "Load Shedding & Graceful Degradation"
topic: distributed-reliability
kind: technique
summary: "Survive severe traffic surges by shedding low-priority requests and degrading non-essential features."
tags: [load-shedding, graceful-degradation, sre, overload-protection]
related: [partial-failure-and-blast-radius, bulkhead-pattern, circuit-breaker-pattern]
---
> **In one line:** Load shedding rejects lower-priority traffic when a system approaches saturation, ensuring high-priority requests complete successfully.

## The idea
Every software system has a breaking point. When incoming traffic exceeds processing capacity:
- Requests accumulate in queues waiting for CPU threads or database connections.
- Queuing delay increases exponentially (per Little's Law).
- Timeouts begin firing on clients, but the server continues burning CPU processing requests that the client has already abandoned!
- The system enters **thrashing**: useful throughput drops to zero, and the entire service collapses.

When a system is overloaded, attempting to process 100% of requests results in 0% of requests succeeding. **Load Shedding** recognizes this reality and deliberately **rejects a fraction of incoming requests immediately at the front door** so that the remaining requests complete with normal, healthy latency.

**Request Prioritization (LIFO Queuing):**
Traditional queues use FIFO (First In, First Out). During an overload spike, incoming requests wait in a huge queue. By the time a request reaches the front of a FIFO queue, its client has already timed out! The server wastes CPU executing a dead request. Modern load shedders switch to **LIFO (Last In, First Out)** or **CoDel (Controlled Delay)**: drop the oldest requests (which have likely timed out anyway) and execute the newest requests immediately!

**Graceful Degradation:**
Rather than crashing, an overloaded service deliberately turns off expensive, non-essential features:
- Disable personalized machine-learning recommendation feeds and serve a static cached top-10 list.
- Turn off live auto-complete search suggestions.
- Drop analytical tracking events.
- Degrade video stream resolution from 4K to 720p.

## See it
Compare system throughput under overload with and without load shedding:

```flow
traffic: Traffic Surge (3x Overload) @neutral
filter: Load Shedder (CPU > 80%) @primary
dropped: Dropped Requests (HTTP 503) @amber
served: High-Priority Checkouts @green
traffic -> filter: Inbound requests
filter -> dropped: Reject non-critical traffic
filter -> served: Complete revenue checkouts
```

```yaml
# NGINX load shedding priority configuration
# Rejects low-priority crawler traffic when system latency spikes
map $http_user_agent $is_crawler {
  default 0;
  ~*(Googlebot|bingbot|crawler) 1;
}

server {
  location /search {
    # If CPU saturated, drop crawlers immediately with HTTP 503
    if ($is_crawler) {
      return 503 "Search temporarily busy; crawlers please backoff";
    }
    proxy_pass http://search_backend;
  }
}
```

> **Tip:** In Google SRE practice, requests carry a priority header (`CRITICAL_PLUS`, `DEFAULT`, `SHEDDABLE`). When server latency approaches saturation, the load shedder drops all `SHEDDABLE` traffic instantly without touching database pools.

## Go deeper
Netflix implemented **Concurrency Limits** (inspired by TCP Vegas congestion control). Rather than setting static connection limits, the application continuously measures round-trip latency. If latency increases without an increase in throughput, the algorithm detects that the downstream queue is filling and dynamically shrinks the permitted concurrency limit, shedding load before the service collapses.
## Watch out
- Ensure rejected requests fail *cheaply*; if returning an HTTP 503 error requires loading template files and rendering JSON, shedding load will still burn CPU!
- Never shed health check probes; if a load shedder drops `/healthz`, load balancers will assume the node is dead and terminate it, worsening the crisis.
## Remember
- Under overload, attempting to serve all requests causes 100% failure; load shedding drops excess traffic to preserve capacity.
- Drop low-priority and sheddable requests first to protect core revenue workflows.
- Gracefully degrade non-essential features to static cached approximations during peak traffic surges.
