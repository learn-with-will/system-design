---
slug: two-phase-commit
title: "Two-Phase Commit (2PC)"
topic: distributed-coordination
kind: concept
summary: "Coordinate atomic transactions across distributed databases using prepare and commit phases, and analyze its blocking nature."
tags: [2pc, distributed-transactions, consensus, atomicity]
related: [the-saga-pattern, saga-orchestration-vs-choreography, transactional-outbox-pattern]
---
> **In one line:** Two-Phase Commit coordinates atomic transactions across distributed nodes via Prepare and Commit phases, but blocks completely if the coordinator fails.

## The idea
In a single relational database, committing a transaction atomically is straightforward: the engine writes the commit record to its local Write-Ahead Log. But in a distributed architecture where an order requires updating an accounts database, an inventory database, and a shipping database running on separate physical servers, achieving atomic "all-or-nothing" execution requires a distributed transaction protocol: **Two-Phase Commit (2PC)**.

2PC coordinates transactions using a central **Coordinator** and multiple **Participants** across two distinct phases:

**Phase 1: The Prepare Phase (Voting)**
1. The coordinator generates a global transaction ID and writes a prepare record to its log.
2. The coordinator sends a `PREPARE` message to all participants over the network.
3. Each participant executes the transaction locally: it checks constraints, acquires necessary row locks, writes changes to its local Write-Ahead Log, and verifies it is 100% capable of committing.
4. Each participant replies with a vote: **"VOTE_COMMIT"** (guaranteeing it can commit if commanded) or **"VOTE_ABORT"** (if a constraint failed).

**Phase 2: The Commit Phase (Execution)**
1. If **all** participants voted "VOTE_COMMIT", the coordinator writes a `COMMIT` record to its disk log and broadcasts `GLOBAL_COMMIT` to all participants. Each participant applies the changes, releases its row locks, and replies with `ACK`.
2. If **even a single participant** voted "VOTE_ABORT" (or timed out without voting), the coordinator writes an `ABORT` record and broadcasts `GLOBAL_ABORT`. Every participant rolls back its local transaction and releases row locks.

**The Fatal Flaw: The Blocking Coordinator**
2PC is a **blocking protocol**. If a participant votes "VOTE_COMMIT" at the end of Phase 1, it surrenders its autonomy. It cannot unilaterally abort, nor can it commit; it must hold all database row locks and wait. If the coordinator crashes or is partitioned off before sending the Phase 2 decision, **participants are stuck in limbo indefinitely**, holding locks and blocking all concurrent traffic on those rows!

## See it
Trace the two phases of a successful Two-Phase Commit transaction:

```sequence
actor coord: 2PC Coordinator @primary
actor p1: Node A (Accounts DB) @blue
actor p2: Node B (Inventory DB) @green
coord -> p1: Phase 1: PREPARE
coord -> p2: Phase 1: PREPARE
note p1..p2: Acquire locks and write WAL
p1 --> coord: VOTE_COMMIT
p2 --> coord: VOTE_COMMIT
note coord: Log COMMIT to local WAL
coord -> p1: Phase 2: GLOBAL_COMMIT
coord -> p2: Phase 2: GLOBAL_COMMIT
note p1..p2: Apply changes and release locks
p1 --> coord: ACK
```

```yaml
# Two-Phase Commit Trade-offs
two_phase_commit_properties:
  atomicity: "Guaranteed all-or-nothing across distributed nodes"
  performance: "Extremely poor (multiple synchronous network roundtrips)"
  availability: "Very fragile; stalls if coordinator crashes during Phase 2"
  scalability: "Does not scale to microservices or cross-datacenter WAN"
```

> **Note:** Because 2PC holds row locks across multiple network round trips, transaction throughput collapses as node count increases. A 2PC transaction across five nodes has its throughput bound by the slowest node and slowest network link.

## Go deeper
Three-Phase Commit (3PC) was designed to make the protocol non-blocking by introducing a "Pre-Commit" phase and timeouts. However, 3PC assumes a network where partitions never occur; when network partitions happen (as they do in real clouds), 3PC can split-brain and violate atomicity, which is why 3PC is rarely used in production.
## Watch out
- Never use 2PC across independent microservices owned by different teams; it couples service availability and holds cross-service database locks.
- Remember that 2PC is not partition-tolerant; network cuts during Phase 2 leave participants holding locks and blocking queries.
## Remember
- 2PC achieves distributed atomicity across Prepare (voting) and Commit (execution) phases.
- Participants that vote commit surrender autonomy and must hold row locks until the coordinator decides.
- Coordinator failure leaves participants blocked in limbo, making 2PC unsuitable for modern microservices.
