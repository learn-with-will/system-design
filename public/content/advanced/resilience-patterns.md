---
id: lesson-18
slug: resilience-patterns
title: "Resilience Patterns"
level: advanced
order: 18
duration: 26
tags:
  - resilience
  - circuit-breaker
  - bulkhead
  - graceful-degradation
  - service-discovery
---

# Learning Objectives

By the end of this lesson you will be able to:

- Explain why **partial failure** is normal and must be contained.
- Describe the **circuit breaker** pattern and its three states.
- Explain the **bulkhead** pattern and what it isolates.
- Apply **graceful degradation** and **load shedding**.
- Say what **service discovery** solves.

# Why It Matters

In a distributed system, something is always broken somewhere — a service is slow, a
dependency is down, a network link is flaky. The danger isn't the single failure; it's the
**cascade**, where one slow dependency ties up resources and drags down everything that
calls it, and everything that calls *them*. Resilience patterns (mostly from Michael
Nygard's *Release It!*) are the well-known techniques for **containing** failures so a fault
stays a fault and never becomes a system-wide outage.

# Concept Explanation

### Partial failure and cascading failure

A single machine either works or crashes. A distributed system lives in between: some parts
work while others fail or hang — **partial failure**. The classic disaster is a **cascading
failure**: Service A calls slow Service B; A's threads pile up waiting; A runs out of
threads and stops serving; everything calling A now fails too. One slow dependency sinks the
whole system. The patterns below break that chain.

### Timeouts and retries (recap)

The foundation, from Lesson 15: **always set timeouts** so you don't wait forever on a hung
dependency, and **retry only what's safe**, with **exponential backoff and jitter** and a
cap. These prevent a slow dependency from tying up your resources and prevent retry storms.

### Circuit breaker

A **circuit breaker** wraps calls to a dependency and watches for failures. Like an
electrical breaker, it **trips** to protect the system. It has three states:

```text
  CLOSED  --- failures exceed threshold --->  OPEN
    ^                                           |
    |                                     (after a cooldown)
    |                                           v
    +------- trial call succeeds ------- HALF-OPEN --- trial fails ---> OPEN
```

- **Closed** (normal): calls flow through; failures are counted.
- **Open** (tripped): once failures cross a threshold, the breaker **fails fast** — it
  rejects calls immediately without hitting the dependency — for a cooldown period. This
  stops hammering a service that's clearly down and lets it recover, and it frees the caller
  from piling up on timeouts.
- **Half-open** (testing): after the cooldown, it lets a **trial** call through; success
  closes the breaker, failure re-opens it.

The circuit breaker turns "wait and pile up" into "fail fast and recover" — the single most
important cascade-stopper.

### Bulkhead

Named after the watertight compartments in a ship's hull, the **bulkhead** pattern
**isolates resources** so a failure in one area can't sink the whole vessel. In software, you
give each dependency (or class of work) its **own** thread pool or connection pool. If
dependency B hangs and exhausts *its* pool, calls to dependency C still have their own pool
and keep working.

```text
  Without bulkhead: one shared pool -> B hangs -> pool exhausted -> A, C, D all starve
  With bulkhead:    separate pools  -> B hangs -> only B's pool exhausted; C, D fine
```

### Graceful degradation and fallbacks

When a dependency fails, **degrade gracefully** instead of failing entirely: return a
sensible **fallback** — cached data, a default value, or a reduced feature. A product page
whose recommendation service is down should still show the product, just without
recommendations. Losing a feature beats losing the page.

### Load shedding

Under overload, it's better to serve *most* requests well than *all* requests badly.
**Load shedding** deliberately **rejects** excess or low-priority requests (often with a
`503` and `Retry-After`) to protect the core from collapse — a controlled sacrifice rather
than a total meltdown.

### Service discovery

In a dynamic system, service instances constantly come and go (autoscaling, deploys,
failures), so their addresses aren't fixed. **Service discovery** is how a caller finds a
healthy instance of a dependency at runtime — via a **service registry** (e.g. Consul,
etcd), DNS-based discovery, or an orchestration platform's built-in mechanism. It usually
pairs with health checks so only healthy instances are returned, and with a load balancer to
spread calls.

# Key Terminology

- **Partial failure** — some components fail or hang while others keep working.
- **Cascading failure** — one failure propagates until much of the system is down.
- **Circuit breaker** — trips to fail fast when a dependency is unhealthy (closed →
  open → half-open).
- **Fail fast** — reject quickly instead of waiting/piling up on a broken dependency.
- **Bulkhead** — isolate resources (e.g. thread pools) so one failure can't exhaust all of
  them.
- **Graceful degradation / fallback** — a reduced but working response when a dependency
  fails.
- **Load shedding** — deliberately dropping excess load to protect the core.
- **Service discovery** — finding healthy instances of a dependency at runtime.

# Options and Trade-offs

| Pattern | Contains | Cost / caveat |
| ------- | -------- | ------------- |
| Timeout | Unbounded waits | Too short = false failures |
| Circuit breaker | Hammering a down dependency; pile-ups | Tuning thresholds; brief false trips |
| Bulkhead | One dependency exhausting all resources | More pools to size and manage |
| Graceful degradation | Total feature failure | Must design fallbacks per feature |
| Load shedding | Overload collapse | Some requests are rejected on purpose |

# Worked Example

A product page calls a **recommendations** service that suddenly slows to a crawl. Without
protection, every product-page request blocks waiting on recommendations, threads pile up,
and the **whole product page goes down** — a cascade from one slow dependency.

Apply three patterns together:

```text
  1. Timeout: cap the recommendations call at, say, 200 ms.
  2. Circuit breaker: after many timeouts, OPEN -> fail fast (skip the call) for a cooldown.
  3. Graceful degradation: on failure/open, render the page WITHOUT recommendations.
  (Bulkhead: recommendations uses its own thread pool, so it can't starve the rest.)
```

Result: recommendations being down becomes a **minor, contained** event — the product page
loads fully and quickly, just missing one section — instead of a site-wide outage. When
recommendations recovers, the half-open breaker notices and restores the feature
automatically. This layering (timeout + breaker + fallback + bulkhead) is the standard
resilience recipe.

# Real World Analogy

A ship's **bulkheads** seal compartments so a hull breach floods one section, not the whole
ship. A **circuit breaker** in your house cuts power to a shorting circuit so the fault
doesn't burn the building down — and you can flip it back on once fixed. **Graceful
degradation** is a car that loses cruise control but still drives. **Load shedding** is a
hospital triaging patients under overload to save the most critical. Each is about
**containing** damage rather than pretending failure won't happen.

# Examples

## Example 1 — Basic: a fallback for a non-critical call

A page shows a live currency conversion from an external API. When that API is slow, the
page falls back to the last cached rate with a "rates may be delayed" note, instead of
failing to load.

**Why this works:** a slightly stale rate is far better than a broken page — graceful
degradation keeps the core usable.

## Example 2 — Real-world: bulkheads between dependencies

A service talks to a database and to a flaky third-party API using **separate** connection
pools. When the third-party API hangs, only its pool is exhausted; database-backed features
keep working.

**Why this works:** isolating resources stops one bad dependency from starving the others.

## Example 3 — Trade-off / pitfall: no circuit breaker

A service calls a down dependency with a 30-second timeout and no breaker. Every request
waits 30 seconds and holds a thread; within a minute the service is out of threads and down —
even though its *own* logic is fine.

**Why this bites:** without a breaker to fail fast, the caller ties up all its resources
waiting on a dead dependency. The breaker would have rejected instantly and kept the service
alive.

# Common Mistakes

- **No circuit breaker on remote calls.** Callers pile up on timeouts and cascade; fail fast
  instead.
- **One shared resource pool for all dependencies.** A single hung dependency starves
  everything; use bulkheads.
- **Failing the whole request when one optional part fails.** Design fallbacks and degrade
  gracefully.
- **Trying to serve everything under overload.** Shed low-priority load to protect the core.
- **Hard-coding service addresses.** Instances move; use service discovery with health
  checks.

# Best Practices

- **Layer the patterns:** timeout + retry (with backoff/jitter) + circuit breaker +
  fallback, per remote dependency.
- **Bulkhead critical dependencies** with their own resource pools.
- **Design graceful degradation** for every non-essential dependency.
- **Shed load deliberately** under overload (reject with 503 + Retry-After) to protect the
  core.
- **Use service discovery + health checks** so callers always reach healthy instances.
- **Test failure**: inject latency and errors (chaos testing) to verify the patterns
  actually contain faults.

# Summary

- In distributed systems **partial failure is normal**, and the real risk is a **cascading
  failure**.
- A **circuit breaker** (closed → open → half-open) makes callers **fail fast** when a
  dependency is unhealthy, stopping pile-ups and letting it recover.
- A **bulkhead** isolates resources (separate pools) so one hung dependency can't starve the
  rest.
- **Graceful degradation** returns a reduced-but-working response; **load shedding** drops
  excess load to protect the core.
- **Service discovery** lets callers find healthy instances as the system changes. Layer
  these patterns and test failure.

# Flash Cards

Q: What is a cascading failure?
A: When one failure (often a slow dependency) ties up a caller's resources, taking the caller down, which takes its callers down — spreading until much of the system fails.

Q: What are the three states of a circuit breaker?
A: Closed (calls flow, failures counted), Open (fail fast without calling the dependency, for a cooldown), and Half-open (a trial call decides whether to close or re-open).

Q: What does the bulkhead pattern isolate, and why?
A: Resources like thread or connection pools — one per dependency — so a single hung dependency exhausts only its own pool and can't starve the others.

Q: What is graceful degradation?
A: Returning a reduced but working response (cached data, a default, or a dropped optional feature) when a dependency fails, instead of failing the whole request.

Q: What problem does load shedding solve?
A: Under overload, serving all requests badly can collapse the system; load shedding deliberately rejects excess or low-priority requests to keep the core healthy.

Q: What does service discovery solve?
A: In a system where instances constantly come and go, it lets a caller find a healthy instance of a dependency at runtime instead of relying on fixed addresses.

# Exercises

### Easy
For a call to a flaky external API, list the resilience patterns you'd apply and, in one
line each, what each one prevents.

### Medium
Explain, with the three states, how a circuit breaker stops a cascading failure when a
dependency goes down and how it recovers when the dependency comes back.

### Challenging
Design the resilience strategy for a checkout page that calls: inventory (critical),
recommendations (optional), and a fraud-check service (critical but sometimes slow). Specify
timeouts, breakers, bulkheads, fallbacks, and what you degrade vs fail. Justify each choice.

# Further Reading

- Michael Nygard, *Release It!* (2nd ed.) — the origin of circuit breaker, bulkhead, and
  the stability patterns.
- Martin Fowler — "CircuitBreaker": https://martinfowler.com/bliki/CircuitBreaker.html
- Google, *Site Reliability Engineering* — "Handling Overload" and "Addressing Cascading
  Failures": https://sre.google/books/
