---
slug: identifying-read-and-write-paths
title: "Identifying Read & Write Paths"
topic: system-architecture
kind: technique
summary: "Deconstruct architectures into separate read and write paths, sizing and optimizing the critical hot path."
tags: [architecture, read-path, write-path, cqrs, hot-path]
related: [system-design-interview-framework, end-to-end-architecture-url-shortener, estimating-qps-and-bandwidth]
---
> **In one line:** Deconstruct systems by isolating the read path from the write path to optimize the critical hot path with tailored storage and caching.

## The idea
A foundational technique in system design is separating an application's architecture into two distinct pipelines: the **Write Path** (how data is ingested, validated, and persisted) and the **Read Path** (how data is queried, transformed, and served to clients).

In almost all web-scale systems, the read path and write path have radically different non-functional requirements:
- **Twitter / Social Feeds:** Massive read-to-write ratio (100:1 or 1,000:1). Writing a tweet happens once; reading tweets happens billions of times. The read path must be hyper-optimized with pre-computed in-memory timelines (Redis), while the write path can be asynchronous.
- **IoT Telemetry / Logging:** Heavy write-to-read ratio (1:100). Billions of metrics are written continuously per hour, but read queries occur rarely during dashboards or incident debugging. The write path must prioritize append-only partitioned log ingestion (Kafka, LSM-tree stores), while the read path can tolerate slower analytical scans.

**Identifying the Hot Path:**
The **Hot Path** is the sequence of components and network calls executed on the most frequent, latency-critical operations. Optimizing a cold path (e.g., user account registration, which happens once in a user's lifetime) yields negligible system benefit; optimizing the hot path (e.g., product page rendering or URL redirection, executed 100,000 times per second) dictates the survival of the platform.

**Command Query Responsibility Segregation (CQRS):**
At scale, architectures formalize this separation using **CQRS**: using an optimized relational model for transactional writes (Command), while streaming changes to denormalized read-optimized stores (Elasticsearch for search, Redis for feeds) for ultra-fast queries (Query).

## See it
Trace the decoupled Read Path and Write Path in a modern content platform:

```flow
w-client: Content Writer @primary
w-app: Ingestion Service @blue
db-w: PostgreSQL Master (WAL) @blue
r-client: Reader Clients @neutral
cdn: Edge CDN Cache @green
r-cache: Redis Cluster @green
w-client -> w-app: POST /articles
w-app -> db-w: Write transaction
r-client -> cdn: GET /articles/99 (HIT: 5ms)
cdn -> r-cache: Miss: Query Redis
```

```yaml
# CQRS Architecture mapping
cqrs_model:
  write_path_command:
    endpoint: "POST /orders"
    datastore: "PostgreSQL Primary (ACID, normalized)"
    focus: "Durability, consistency, transaction integrity"
  read_path_query:
    endpoint: "GET /orders/search?q=..."
    datastore: "Elasticsearch Cluster (Denormalized, indexed)"
    focus: "Sub-50ms latency, high QPS, fuzzy search"
    sync_mechanism: "CDC Kafka Stream from Postgres WAL"
```

> **Tip:** In any system design exercise, immediately ask: *"Is this system read-heavy or write-heavy?"* The answer immediately dictates whether your design centers around in-memory caching and CDNs (read-heavy) or append-only queues and LSM-trees (write-heavy).

## Go deeper
The "Fan-out on Write" (Push) vs "Fan-out on Read" (Pull) dilemma in social media illustrates read/write trade-offs:
- *Fan-out on Write:* When a user tweets, push the tweet into the pre-computed home feed cache of all their followers. Reads are instantaneous ($O(1)$ memory lookup), but writing for a celebrity with 80 million followers takes minutes!
- *Hybrid Solution:* Regular users use Fan-out on Write; celebrities with > 100,000 followers use Fan-out on Read (their tweets are merged into the feed at read time).
## Watch out
- Do not apply CQRS to simple CRUD applications; maintaining two separate data models connected via asynchronous replication adds significant operational overhead.
- Ensure the read path can tolerate eventual consistency when decoupled from the write path.
## Remember
- Separate the system into distinct Write Paths (durability/consistency) and Read Paths (low latency/scale).
- Optimize the Hot Path—the most frequent, latency-critical operations in the system.
- CQRS uses separate, optimized data models for writes (normalized SQL) and reads (denormalized Redis/Elasticsearch).
