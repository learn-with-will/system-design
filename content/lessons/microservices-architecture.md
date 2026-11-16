---
slug: microservices-architecture
title: "Microservices Architecture"
topic: system-architecture
kind: pattern
summary: "Independent deployment, polyglot autonomy, database-per-service principles, and operational trade-offs."
tags: [microservices, distributed-systems, architecture, service-boundaries]
related: [the-modular-monolith, bounded-contexts-and-service-boundaries, the-distributed-monolith]
---
> **In one line:** A microservices architecture decomposes an application into small, independently deployable services organized around business domains.

## The idea
As an engineering organization expands from ten engineers to several hundred, monolithic codebases encounter severe organizational bottlenecks:
- Multiple teams push conflicting code to the same repository, leading to merge conflicts and broken master branches.
- Deploying a minor one-line bug fix in the search feature requires rebuilding, testing, and deploying the entire multi-gigabyte application.
- A memory leak in a minor reporting component takes down the entire application, halting revenue checkout.

A **Microservices Architecture** structures an application as a suite of small, autonomous services:
1. **Organized Around Business Capabilities:** Each microservice models a specific business domain (e.g., Catalog Service, Order Service, Billing Service, Shipping Service).
2. **Independently Deployable:** A team can modify, test, and deploy their microservice to production twenty times a day without coordinating with or waiting for other teams.
3. **Database-Per-Service:** **Each microservice strictly owns its own private database**. No other service is permitted to read or write directly to that database; all data access must pass through the service's public API (REST, gRPC, or event streaming).
4. **Polyglot Freedom:** Teams can choose the optimal programming language and database for their specific workload (e.g., Python + Postgres for AI search, Go + Redis for high-throughput rate limiting).

**The Architectural Tax:**
Microservices solve **organizational scaling**, but they introduce massive **technical complexity**: network latency on every call, distributed transaction management (sagas), complex observability (distributed tracing), partial network failures, and intricate CI/CD infrastructure.

## See it
Compare Monolithic and Microservices organizational architectures:

| Architectural Dimension | Monolithic Architecture | Microservices Architecture |
|---|---|---|
| **Deployment Model** | Single unified deployment pipeline | Dozens/hundreds of independent pipelines |
| **Data Storage** | Shared central relational database | Database-per-service (strictly isolated) |
| **Communication** | In-memory function calls (nanoseconds) | Network RPC / gRPC / JSON (milliseconds) |
| **Failure Modes** | Simple (crashes whole process) | Partial failures, cascading timeouts, network partitions |
| **Organizational Fit** | Small teams (< 20–30 engineers) | Large distributed teams (100+ engineers) |
| **Operational Overhead** | Low (simple monitoring and hosting) | High (Kubernetes, service mesh, distributed tracing) |

```yaml
# Microservices deployment topology configuration
microservices_mesh:
  order_service:
    team: "checkout-squad"
    runtime: "go-1.22"
    database: "postgres-order-db" # Private DB!
    ingress: "grpc / protobuf"
  catalog_service:
    team: "discovery-squad"
    runtime: "node-20"
    database: "mongodb-catalog"   # Private DB!
    ingress: "rest / http"
```

> **Tip:** Martin Fowler articulated the **MonolithFirst** principle: *"Almost all successful microservice stories have started with a monolith that got too big and was broken up. Almost all cases where I've heard of a system that was built as a microservice system from scratch have ended up in serious trouble."*

## Go deeper
Microservices shift communication from CPU registers to network cables. A single user request that required 5 internal function calls in a monolith now incurs 5 network hops. If each hop averages 10 ms, network transit alone adds 50 ms to baseline user latency before accounting for serialization and query execution.
## Watch out
- Never share a single database across multiple microservices; shared databases couple schemas and create a distributed monolith.
- Do not adopt microservices to "fix bad code"; if your team cannot build clean modular boundaries in a monolith, microservices will simply produce a distributed mess.
## Remember
- Microservices decompose an application into independently deployable services around business domains.
- Each service must strictly own its private database to prevent coupling.
- Microservices solve organizational scaling for large teams at the expense of distributed systems complexity.
