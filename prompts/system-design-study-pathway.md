# System Design Study Pathway
### A Comprehensive, Phase-by-Phase Curriculum

> **Based on:** *Designing Data-Intensive Applications* (Kleppmann), the Google SRE
> book, the foundational papers (CAP — Gilbert & Lynch and Brewer 2012; PACELC — Abadi;
> Dynamo; Raft; Paxos), the relevant IETF RFCs and MDN for protocol facts, and
> microservices.io / *Release It!* for patterns.
> **Approach:** vendor-neutral principles first, concrete systems only as verifiable
> examples. Each lesson builds on the ones before it — you cannot reason about
> partitioning before replication, or about CAP before consistency models.
> **Language:** plain and welcoming; every term is defined the first time it appears.

---

## Phase 1 — Beginner: The Foundations

**Goal:** Understand what system design is and the building blocks every system is made
of — the network, APIs, storage, caching, and load balancing.
**Exit criteria:** You can turn a vague feature request into functional and
non-functional requirements, size a system with back-of-the-envelope math, and sketch a
basic web architecture (client → load balancer → stateless app → cache → database).

1. **What Is System Design?** — functional vs non-functional requirements; the
   reliability / scalability / maintainability lens (DDIA Ch. 1); the design process and
   why trade-offs, not "right answers", are the point.
2. **Scalability, Availability & Performance** — latency vs throughput; availability as
   "nines" (with the real downtime math); SLA vs SLO vs SLI; percentiles (p99) over
   averages.
3. **Back-of-the-Envelope Estimation** — powers of two and data-size units; the latency
   numbers every engineer should know (as approximate orders of magnitude); estimating
   QPS, storage, and bandwidth from assumptions you state out loud.
4. **How the Internet Works for Designers** — IP, TCP vs UDP, DNS, HTTP/HTTPS, and TLS;
   what a request's round trip actually costs; where a CDN fits.
5. **Designing APIs** — REST over HTTP (methods, status codes, idempotency, safe
   methods), RPC/gRPC, and GraphQL; pagination, versioning, and error design.
6. **Storage Foundations: SQL vs NoSQL** — the relational model and ACID; the NoSQL
   families (key-value, document, wide-column, graph) and when each fits; ACID vs BASE.
7. **Caching** — cache-aside, read-through, write-through, and write-back; TTLs and
   eviction (LRU/LFU); cache invalidation and stampedes; the CDN as an edge cache.
8. **Load Balancing & Reverse Proxies** — L4 vs L7; round-robin, least-connections, and
   hashing; health checks; the reverse proxy's role in front of a fleet.

---

## Phase 2 — Intermediate: Data & Distribution

**Goal:** Take the single-box mental model apart. Learn how data is replicated,
partitioned, kept (in)consistent, and moved between services — and the theorems that
bound what is possible.
**Exit criteria:** You can explain replication and sharding, choose a consistency model
for a use case, state CAP and PACELC precisely, design an event-driven flow with sane
delivery guarantees, and protect a service with rate limits.

9. **Scaling Out: Statelessness & the Scaling Cube** — vertical vs horizontal scaling;
   why stateless services scale and where the state actually goes; the AKF scale cube
   (x/y/z axes).
10. **Database Replication** — leader–follower (and multi-leader, leaderless); synchronous
    vs asynchronous; replication lag and the read-your-writes problem; failover and its
    hazards.
11. **Partitioning (Sharding)** — partitioning by key range vs hash; **consistent
    hashing** and virtual nodes (from Dynamo); hotspots and rebalancing; routing a request
    to the right shard.
12. **Consistency Models** — strong vs eventual consistency; read-your-writes, monotonic
    reads, and causal consistency; **linearizability vs serializability** and why they are
    not the same thing (DDIA Ch. 7 & 9).
13. **CAP & PACELC** — the precise statement of CAP (a partition forces a choice between
    consistency and availability), why "2 of 3" is misleading, and PACELC's extension
    (Else, the latency-vs-consistency trade-off when there is no partition).
14. **Messaging & Event Streaming** — queues vs logs; the Kafka log model (partitions,
    offsets, consumer groups); delivery semantics (at-most-once, at-least-once,
    exactly-once) and why end-to-end exactly-once needs idempotency; backpressure.
15. **Reliable Communication: Idempotency, Retries & Timeouts** — idempotency keys and
    deduplication; timeouts; retries with exponential backoff **and jitter**; why naive
    retries cause retry storms.
16. **Rate Limiting & API Gateways** — token bucket, leaky bucket, fixed-window, and
    sliding-window algorithms; where limits live; the API gateway's responsibilities
    (routing, auth, limiting, aggregation).

---

## Phase 3 — Advanced: Architecture & Operations

**Goal:** Compose services into a system that survives failure and can be operated in
production — and learn to design one from scratch.
**Exit criteria:** You can weigh a monolith against microservices, apply resilience
patterns, keep data consistent across services without distributed transactions, explain
consensus, design for failure, make a system observable and secure, and run a full design
from requirements to bottlenecks.

17. **Monoliths vs Microservices** — the real trade-offs; how to find service
    boundaries; the "distributed monolith" anti-pattern and when a monolith is the right
    call.
18. **Resilience Patterns** — timeouts, retries, the **circuit breaker**, the
    **bulkhead**, graceful degradation, and service discovery (from *Release It!*).
19. **Distributed Transactions: Saga, 2PC, Outbox** — why cross-service atomicity is
    hard; two-phase commit and its blocking cost; the **saga** pattern (choreography vs
    orchestration) and compensations; the **transactional outbox** for reliable events.
20. **Consensus & Coordination** — why agreement is hard; **quorums**; **Raft** (leader
    election + log replication) and a word on Paxos; what ZooKeeper/etcd give you (leader
    election, config, locks).
21. **Designing for Failure** — single points of failure; redundancy (N+1) and failover;
    graceful degradation; disaster recovery, RTO and RPO; health checks and load shedding.
22. **Observability** — logs, metrics, and traces (the three pillars); the RED and USE
    methods; distributed tracing; alerting on SLOs and spending an error budget.
23. **Security Essentials** — authentication vs authorization; TLS in transit; OAuth 2.0
    and OpenID Connect; secrets management; least privilege and defense in depth; rate
    limiting as an abuse control.
24. **Capstone: Designing a System End to End** — a repeatable framework (requirements →
    estimation → API → data model → high-level design → scaling → bottlenecks →
    trade-offs) applied to one worked example, tying every prior lesson together.

---

## How to use this pathway

- **Don't skip.** Phase 2 assumes the building blocks from Phase 1; Phase 3 assumes you
  can reason about replication, consistency, and CAP. Partitioning builds on replication;
  CAP builds on consistency models; sagas build on messaging and idempotency.
- **Think in trade-offs.** There is rarely one right answer. For each topic, ask: what
  does this buy me, what does it cost, and when is the cost worth it?
- **Do the estimates.** The exercises ask you to size systems and choose between options.
  Write down your assumptions — that is the skill.
- **Take the quizzes.** Every lesson has a quiz; a passing score means the ideas landed.
- **Verify against the sources.** When unsure about a guarantee, a theorem, or a number,
  check DDIA, the SRE book, or the original paper — accuracy over assumption.
