---
slug: what-is-system-design
title: "What Is System Design?"
topic: foundations
kind: concept
summary: "System design defines component architecture to meet functional and non-functional goals at scale."
tags: [fundamentals, architecture, scalability]
related: [functional-vs-non-functional-requirements, reliability-scalability-maintainability, the-nature-of-trade-offs]
---
> **In one line:** System design is the engineering discipline of structuring hardware, services, and data stores into a cohesive architecture that satisfies requirements at scale.

## The idea
Every software project starts small: an application running on a developer's laptop with a local database. In that environment, network latency is effectively zero, hardware resources are isolated, and concurrent load is virtually absent. But production systems must operate reliably across unreliable networks, handle millions of concurrent users, and process terabytes of data without data corruption or outages.

System design answers the question: how do we decompose an application into interconnected parts—web servers, application logic, caching layers, databases, and message queues—so that the entire system functions as a coherent, resilient whole? Rather than writing individual algorithms or classes, a system designer decides where state lives, how components communicate, where bottlenecks will emerge, and how the system will handle failures.

A system is rarely static. As traffic increases by orders of magnitude, architectures that worked flawlessly at ten requests per second collapse under ten thousand requests per second. Designing a system is fundamentally an exercise in anticipating growth and building modular seams where scale and fault tolerance can be injected without rewriting the application from scratch.

## See it
Consider a modern three-tier web application architecture. User traffic enters through an edge layer, passes through reverse proxies and stateless application servers, and accesses separated cache and database tiers:

```flow
client: Web & Mobile Clients | HTTPS requests @neutral
edge: Edge CDN & DNS | Anycast routing @blue
lb: Load Balancers | Layer 7 routing @blue
app: Application Servers | Stateless containers @primary
cache: Redis Cache | Memory store @green
db: Primary Database | Relational storage @amber
client -> edge: DNS lookup & TLS
edge -> lb: Forward request
lb -> app: Distribute load
app -> cache: Read cache
app -> db: Write transaction
```

```yaml
# High-level architecture tier configuration
tiers:
  edge:
    type: cdn
    provider: anycast
  gateway:
    instances: 3
    type: reverse-proxy
    health_check: /healthz
  application:
    autoscaling:
      min_replicas: 4
      max_replicas: 32
      target_cpu_utilization: 70
  storage:
    primary: postgresql
    cache: redis-cluster
```

> **Note:** Notice that compute and storage are strictly decoupled. When traffic surges, application containers scale out dynamically without altering database topologies.

## Go deeper
The classic mental model from Martin Kleppmann's *Designing Data-Intensive Applications* separates applications into data systems. Modern systems are composed of specialized sub-systems: relational databases for ACID transactions, search indexes for text retrieval, caches for hot data, and stream processors for asynchronous events. The system designer's challenge is stitching these heterogeneous tools together while maintaining operational simplicity.
## Watch out
- Do not jump into microservices, sharding, or complex distributed topologies before understanding actual traffic volumes and requirements.
- Never treat system design as choosing "the best" technology; every tool introduces specific operational costs and failure modes.
## Remember
- System design organizes services, networks, and data stores into a resilient architecture.
- Decoupling compute from state is the primary foundation for horizontal scalability.
- Systems must be designed for evolution, starting simple and introducing complexity only when justified.
