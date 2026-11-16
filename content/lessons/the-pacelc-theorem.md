---
slug: the-pacelc-theorem
title: "The PACELC Theorem"
topic: consistency-and-tradeoffs
kind: concept
summary: "Extend CAP beyond partitions: If Partition: Availability vs Consistency; Else: Latency vs Consistency."
tags: [pacelc, cap-theorem, latency, consistency]
related: [the-cap-theorem-explained, cap-myths-and-nuance, linearizability-strong-consistency]
---
> **In one line:** PACELC states that if there is a Partition, trade Availability vs Consistency; Else, trade Latency vs Consistency.

## The idea
While the CAP theorem captures system behavior during rare network partitions, it says nothing about normal operations. In 2012, Yale computer science professor Daniel Abadi formulated the **PACELC Theorem** to provide a complete framework covering both partition states and normal operating conditions.

PACELC is structured as an `if/else` rule:
$$\text{If } \mathbf{P} \text{ (Partition): } \mathbf{A} \text{ or } \mathbf{C} \quad | \quad \text{Else: } \mathbf{L} \text{ or } \mathbf{C}$$

Expanded in plain English:
- **If there is a Partition (P):** How does the system choose between **Availability (A)** and **Consistency (C)**? (This is standard CAP).
- **Else (E) (during normal operation):** How does the system choose between **Latency (L)** and **Consistency (C)**?

**The "Else" Trade-Off (Latency vs Consistency):**
When the network is running smoothly without partitions, achieving strong consistency still incurs a penalty: **latency**.
- To guarantee that reads always see the latest write, a node must synchronously replicate data to multiple replicas, wait for network acknowledgments, or execute distributed locking. You gain Consistency, but you pay with higher Latency (**PC/EC**).
- If you want ultra-low read and write latency (sub-millisecond memory speed), you write locally and replicate asynchronously in the background. You gain low Latency, but you risk serving slightly stale data (**PA/EL**).

## See it
Categorize major distributed databases across the PACELC taxonomy:

| Database | PACELC Classification | Partition Behavior | Normal Operation Behavior |
|---|---|---|---|
| **MongoDB** | **PC/EC** | CP: Rejects writes if leader is partitioned | Strong consistency: writes wait for majority replica sync |
| **Apache Cassandra** | **PA/EL** | AP: Continues accepting writes on available nodes | Low latency: asynchronous gossip replication |
| **AWS DynamoDB** | **PA/EL** (Default) | AP: Highly available partition design | Low latency by default; optional strong reads (EC) |
| **Google Spanner** | **PC/EC** | CP: TrueTime atomic clocks ensure linearizability | Strict consistency via synchronous Paxos consensus |
| **PostgreSQL (Async)** | **PC/EL** | CP: Single leader rejects writes if isolated | Low latency reads on async replicas; eventual consistency |

```yaml
# PACELC decision model
pacelc_decision_tree:
  partition_active:
    trade_off: "Availability (A) vs Consistency (C)"
    example: "Does the node fail closed (C) or accept local writes (A)?"
  normal_operation:
    trade_off: "Latency (L) vs Consistency (C)"
    example: "Do writes block for cross-node replication (C) or return in 1ms (L)?"
```

> **Tip:** When evaluating distributed databases, PACELC provides a far more accurate assessment of real-world performance than CAP because it explicitly accounts for everyday latency costs.

## Go deeper
Daniel Abadi created PACELC after observing that database vendors were marketing systems as "consistent" without disclosing that their read and write latencies were 10x higher due to synchronous cross-datacenter two-phase commit protocols.
## Watch out
- Do not assume a database is "fast" just because it claims consistency; strong consistency during normal operations always incurs replication latency.
- Evaluate your p99 latency requirements under normal operations before deciding between PC/EC and PA/EL.
## Remember
- PACELC extends CAP to address system trade-offs during normal, partition-free operations.
- If Partition: choose between Availability and Consistency; Else: choose between Latency and Consistency.
- Systems cannot provide both sub-millisecond latency and linearizable consistency simultaneously.
