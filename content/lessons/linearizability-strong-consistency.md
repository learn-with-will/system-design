---
slug: linearizability-strong-consistency
title: "Linearizability: Strong Consistency"
topic: consistency-and-tradeoffs
kind: concept
summary: "Define strong consistency: single-copy illusion, real-time ordering guarantees, and why the network makes it slow."
tags: [linearizability, strong-consistency, consistency-models, ddia]
related: [eventual-consistency, causal-consistency, the-cap-theorem-explained]
---
> **In one line:** Linearizability guarantees that all operations appear to execute atomically on a single, global copy of data in real time.

## The idea
In distributed systems, the term "strong consistency" is used colloquially, but its formal, mathematically precise definition is **Linearizability** (also known as atomic consistency).

The basic idea behind linearizability is to make a distributed, multi-replica system appear to the outside world as if **there were only a single copy of the data in existence, and all operations execute atomically**.

Under linearizability, there is a global, real-world timeline:
1. As soon as a single client completes a write operation and receives confirmation of success, **all subsequent read operations initiated anywhere in the world must return the new value (or a newer one)**.
2. If Client A reads the new value, Client B can never subsequently read an older value.
3. Operations cannot jump backward in time.

Linearizability is mandatory for specific critical operations:
- **Leader Election:** Ensuring only one leader node holds the lease (split-brain prevention).
- **Uniqueness Constraints:** Guaranteeing a username or email is claimed by exactly one user.
- **Financial Account Balances:** Preventing double-spending or overdrawn overdraft limits.

The cost of linearizability is **performance and availability**. To provide a real-time recency guarantee, replicas must coordinate over the network (via consensus protocols like Raft or synchronous quorums). If a network partition severs communication between nodes, a linearizable system **must refuse writes** to avoid serving stale or conflicting state, directly sacrificing availability.

## See it
Trace how linearizability enforces a global real-time ordering constraint:

```sequence
actor writer: Client A (Writer)
actor reader1: Client B (Reader)
actor reader2: Client C (Reader)
actor cluster: Distributed Storage @primary
writer -> cluster: Set X = 42 (Write Begins)
cluster --> writer: OK (Write Completes at T1)
reader1 -> cluster: Get X (Initiated after T1)
cluster --> reader1: Returns 42 (Must see latest write!)
reader2 -> cluster: Get X (Initiated after Client B)
cluster --> reader2: Returns 42 (Can NEVER return old value!)
```

```yaml
# Distributed Consensus / Linearizable Store Configuration (etcd)
etcd_cluster:
  consensus_protocol: raft
  consistency_level: linearizable
  # Linearizable reads require contacting a quorum of nodes
  # to verify the leader is still the legitimate leader
  read_consistency: "linearizable" # vs "serializable" (local leader read)
```

> **Note:** Notice that in etcd, even a *read* operation requires contacting a quorum of Raft nodes to ensure the leader has not been partitioned off (preventing stale reads from a partitioned ex-leader).

## Go deeper
Do not confuse **Linearizability** with **Serializability**:
- *Linearizability* is a **recency guarantee** about single operations on individual registers (reads see the latest real-time write).
- *Serializability* is an **isolation guarantee** for multi-operation transactions (transactions behave as if run one after another, though not necessarily in real-world time order).
- *Strict Serializability* combines both: transactions execute serially and respect real-time global ordering.
## Watch out
- Do not assume standard SQL databases with read replicas are linearizable; replication lag violates linearizability immediately.
- Linearizability incurs significant latency; do not mandate it for social feeds, comments, or non-critical telemetry.
## Remember
- Linearizability makes a multi-node cluster behave as if it were a single copy of data in real time.
- Once a write completes, all subsequent reads globally must reflect that write or a newer one.
- Linearizability requires network coordination (consensus) and must reject writes during network partitions.
