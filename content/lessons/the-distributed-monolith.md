---
slug: the-distributed-monolith
title: "The Distributed Monolith Anti-Pattern"
topic: system-architecture
kind: pitfall
summary: "Recognize the worst of all worlds: shared databases, synchronous chaining, lock-step deployments, and distributed failure."
tags: [distributed-monolith, anti-patterns, microservices, coupling]
related: [the-modular-monolith, microservices-architecture, bounded-contexts-and-service-boundaries]
---
> **In one line:** A distributed monolith combines the operational headaches of microservices with the tight coupling of a monolith, creating the worst of both worlds.

## The idea
When an organization breaks up a monolith without understanding distributed systems design, they frequently construct the most toxic anti-pattern in software architecture: **The Distributed Monolith**.

A distributed monolith occurs when a system is partitioned into separate deployable processes and network repositories, but the services remain **tightly coupled in lock-step**:
- **Shared Database Anti-Pattern:** Multiple separate microservices all connect directly to the same central database instance and execute queries against each other's tables.
- **Synchronous Call Chaining:** Fulfilling a single request requires a synchronous, blocking chain of five network hops: Service A calls B, which calls C, which calls D, which calls E. If Service D is slow, the entire chain stalls.
- **Lock-Step Deployments:** Shipping a feature requires deploying Service A v2.1, Service B v1.4, and Service C v3.0 simultaneously in an exact sequence. If one deployment fails, none can run.
- **Cascading Outages:** Because services lack circuit breakers and timeouts, a failure in a minor downstream dependency cascades across the network, crashing the entire platform.

A distributed monolith achieves **the worst of both worlds**: you suffer all the network latency, distributed debugging nightmares, and infrastructure costs of microservices, while enjoying none of the autonomous deployments, independent scaling, or fault isolation of true microservices.

## See it
Compare a true microservice architecture with a Distributed Monolith:

| Characteristic | True Microservices | Distributed Monolith (Anti-Pattern) |
|---|---|---|
| **Database Ownership** | Strictly database-per-service | Multiple services query the same shared DB |
| **Deployments** | Fully independent (services deploy alone) | Coordinated lock-step (must deploy services together) |
| **Communication** | Asynchronous events / decoupled APIs | Synchronous blocking RPC call chains (A -> B -> C -> D) |
| **Failure Behavior** | Isolated; graceful degradation | Cascading; one slow node halts all services |
| **Shared Code** | Minimal; independent domain models | Heavy shared `common-utils` library coupling all repos |

```flow
client: Incoming Request @neutral
sa: Service A (Blocking) @red
sb: Service B (Blocking) @red
sc: Service C (Slow: 5s delay) @red
sd: Service D (CRASHED!) @red
client -> sa: Request
sa -> sb: Sync RPC
sb -> sc: Sync RPC
sc -> sd: Sync RPC (Fails!)
```

```json
// Diagnostic checklist: Are you running a distributed monolith?
{
  "warning_signs": [
    "Changing a database column requires coordinating code changes across 3 service repositories",
    "Local development requires booting 25 Docker containers on your laptop simultaneously",
    "A failure in the notification service causes checkout API requests to return HTTP 500",
    "All service repositories depend on the exact same shared internal Git submodule"
  ]
}
```

> **Tip:** If you find yourself in a distributed monolith, **merge services back together!** Consolidating tightly coupled services back into a clean modular monolith is a sign of engineering maturity, not failure.

## Go deeper
The root cause of distributed monoliths is usually **premature decomposition**: splitting an application into microservices before the business domain boundaries were well understood. When domain boundaries shift, tightly coupled logic that should have been in the same module is stranded across network boundaries.
## Watch out
- Never allow multiple microservices to read or write to the same shared database schema.
- Eliminate synchronous deep call chains; use asynchronous event streaming (Kafka/RabbitMQ) for inter-service communication.
## Remember
- A distributed monolith has all the operational pain of microservices and none of the benefits.
- Key symptoms: shared databases, lock-step deployments, and synchronous call chains.
- If microservices are tightly coupled, merge them back into a modular monolith.
