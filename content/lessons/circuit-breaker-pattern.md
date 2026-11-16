---
slug: circuit-breaker-pattern
title: "The Circuit Breaker Pattern"
topic: distributed-reliability
kind: pattern
summary: "Implement the three states: Closed, Open, and Half-Open to fast-fail dead dependencies and allow recovery."
tags: [circuit-breaker, resilience, patterns, stability]
related: [partial-failure-and-blast-radius, bulkhead-pattern, timeout-strategies]
---
> **In one line:** A circuit breaker wraps remote calls to detect failures and fail fast in the Open state, preventing dead dependencies from exhausting system resources.

## The idea
In electrical engineering, a circuit breaker trips when current spikes dangerously high, severing the connection to protect the house from burning down. In distributed software, Michael Nygard popularized the **Circuit Breaker Pattern** in *Release It!* to protect applications from slow, failing remote dependencies.

When a downstream service is down or saturated:
- Sending thousands of requests that all wait for a 3-second timeout is disastrous: it ties up caller worker threads, consumes memory buffers, and prevents the struggling downstream service from ever recovering.
- A circuit breaker wraps the remote network call and monitors failure rates.

A circuit breaker operates as a state machine with **three states**:
1. **CLOSED (Normal Operation):** All requests are allowed through to the remote service. The circuit breaker counts successes and failures. If the failure rate (or timeout rate) exceeds a configured threshold (e.g., 50% failures over 20 requests), **the breaker trips to OPEN**.
2. **OPEN (Fast-Fail Mode):** The circuit breaker intercepts all subsequent requests and **fails them immediately** (returning an error or fallback data) *without making any network call*. The caller threads are freed in microseconds, and the downstream service is granted breathing room to reboot or recover.
3. **HALF-OPEN (Probing Mode):** After a configured sleep window (e.g., 30 seconds), the breaker transitions to Half-Open. It allows a small, controlled sample of requests (e.g., 3 requests) through to the remote service:
   - If those probe requests succeed, the breaker resets to **CLOSED**.
   - If any probe request fails, the breaker trips back to **OPEN** for another 30 seconds.

## See it
Trace the three-state lifecycle of a software circuit breaker:

```tree
Circuit Breaker States
  Closed (Normal)
    [Closed] Healthy | All requests flow through to remote @green
  Open (Fast-Fail)
    [Open] Tripped | Failure threshold exceeded; fast-fail @red
  Half-Open (Probing)
    [HalfOpen] Cooldown | Trial probes sent; reset or re-trip @amber
```

```javascript
// Minimal Circuit Breaker implementation
class CircuitBreaker {
  constructor(cooldownMs = 30000) {
    this.state = 'CLOSED';
    this.cooldownMs = cooldownMs;
    this.nextAttempt = Date.now();
  }
  async execute(action, fallbackFn) {
    if (this.state === 'OPEN') {
      if (Date.now() <= this.nextAttempt) return fallbackFn();
      this.state = 'HALF_OPEN';
    }
    try {
      const res = await action();
      this.state = 'CLOSED';
      return res;
    } catch {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.cooldownMs;
      return fallbackFn();
    }
  }
}
```

> **Tip:** Popular production circuit breaker libraries include Resilience4j (Java), Polly (.NET), and Opossum (Node.js), as well as native service mesh sidecars like Envoy.

## Go deeper
Circuit breakers should always be paired with **fallback mechanisms**. If the circuit breaker for a currency conversion service trips to OPEN, the fallback can return cached exchange rates from an hour ago with a diagnostic flag `rate_estimated: true`.
## Watch out
- Ensure the failure threshold is based on a minimum request volume; 2 failures out of 2 requests (100%) during a quiet hour should not trip the breaker.
- Do not count standard business validation errors (HTTP 400 or 404) as breaker failures; track exclusively 5xx errors and network timeouts.
## Remember
- Circuit breakers prevent slow, dead dependencies from exhausting caller thread pools.
- The three states are Closed (normal), Open (fast-fail without network call), and Half-Open (probing).
- Always pair circuit breakers with meaningful fallback data to ensure graceful degradation.
