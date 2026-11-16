---
slug: acid-vs-base
title: "ACID vs BASE"
topic: storage-and-caching
kind: concept
summary: "Contrast the pessimistic transactional guarantees of ACID with the optimistic, eventually consistent BASE model."
tags: [acid, base, consistency, distributed-systems]
related: [relational-databases-and-acid, nosql-data-models, eventual-consistency]
---
> **In one line:** ACID prioritizes immediate strict consistency and data safety; BASE prioritizes high availability and partition resilience by embracing eventual consistency.

## The idea
In distributed data systems, architectures are characterized by their philosophy regarding data consistency and availability. This divide is captured by the acronyms **ACID** and **BASE**.

**ACID (Pessimistic & Immediate):**
Originating in traditional relational databases, ACID (Atomicity, Consistency, Isolation, Durability) adopts a pessimistic stance. It assumes that data corruption, race conditions, and concurrent read anomalies are intolerable. To prevent inconsistencies, ACID databases acquire locks on rows or tables, force transactions to wait, and abort conflicting operations. ACID ensures that once a transaction completes, every reader in the system immediately sees the updated state. This model is essential for financial ledgers, inventory deductions, and billing pipelines.

**BASE (Optimistic & Eventual):**
Coined by Eric Brewer, BASE stands for:
- **Basically Available:** The system prioritizes availability over consistency. Rather than rejecting writes when network partitions or node failures occur, the system continues accepting requests, even if some replicas are temporarily unreachable.
- **Soft State:** The state of the system may change over time, even without new user input, as background replication processes asynchronously propagate updates across nodes.
- **Eventual Consistency:** If no further updates are made to a record, all replicas will eventually converge to the identical value. In the short term, different readers may observe slightly different or stale versions of the data.

BASE reflects the reality of large-scale distributed systems operating across geographical regions. When Amazon displays product reviews or Twitter displays likes, immediate global consistency is unnecessary; showing a review 2 seconds late is preferable to failing the entire page.

## See it
Compare the core philosophies of the ACID and BASE paradigms:

| Property | ACID Model | BASE Model |
|---|---|---|
| **Focus** | Absolute consistency and correctness | High availability and horizontal fault tolerance |
| **Consistency Guarantee** | Immediate, strong consistency | Eventual consistency; temporary soft state |
| **Concurrency Mechanism** | Pessimistic locking, isolation levels, rollback | Optimistic concurrency, version vectors, async sync |
| **Partition Tolerance** | Poor; stalls or fails during network partitions | High; continues accepting local reads and writes |
| **Typical Systems** | PostgreSQL, Oracle, MySQL, SQL Server | Cassandra, DynamoDB, Couchbase, Riak |
| **Canonical Workloads** | Financial accounting, checkout inventory | Social feeds, product reviews, video streaming |

```flow
client: User A | Writes comment @primary
node-us: US Node | Stores comment locally @blue
node-eu: EU Node | Replicates asynchronously @amber
reader: User B | Reads from EU replica @green
client -> node-us: Write accepted
node-us -> node-eu: Async replication lag (~200ms)
reader -> node-eu: Read query (Eventual consistency)
```

```sql
-- ACID: Pessimistic transaction with immediate strict consistency
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
UPDATE accounts SET balance = balance - 100 WHERE id = 'user_a';
UPDATE accounts SET balance = balance + 100 WHERE id = 'user_b';
COMMIT;
```

> **Note:** During the 200ms gossip replication lag, User B experiences the "soft state" of the BASE system. Once replication completes, the system converges to full consistency.

## Go deeper
The transition from ACID to BASE is not all-or-nothing. Modern architectures employ **Polyglot Persistence**: using an ACID relational database for core financial billing and user identity, alongside BASE distributed stores for activity feeds, user comments, and analytics telemetry.
## Watch out
- Do not apply the BASE model to financial transactions or critical inventory counters where overselling causes real business damage.
- Remember that "eventually" in eventual consistency has no bound; during severe network partitions, convergence can take minutes or hours.
## Remember
- ACID enforces immediate strong consistency through locks and transactions.
- BASE embraces Basically Available, Soft state, and Eventual consistency to maximize uptime and scale.
- Most large-scale systems use polyglot persistence: ACID for transactional cores, BASE for high-volume content.
