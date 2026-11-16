---
slug: paxos-and-raft-compared
title: "Paxos & Raft Compared"
topic: distributed-coordination
kind: concept
summary: "Compare multi-decree Paxos proposal rounds with Raft strong-leader logs, and understand why industry chose Raft."
tags: [paxos, raft, consensus, distributed-systems]
related: [distributed-consensus-fundamentals, the-raft-consensus-algorithm, distributed-locks-and-leases]
---
> **In one line:** Paxos operates on generalized proposal-round consensus across arbitrary nodes; Raft enforces a strong leader with sequential log replication for comprehensibility.

## The idea
For over two decades following Leslie Lamport's 1998 paper *The Part-Time Parliament* (and 2001's *Paxos Made Simple*), **Paxos** was the undisputed foundation of distributed consensus. Systems like Google Chubby, Google Spanner, and Apache ZooKeeper (Zab) trace their lineage to Paxos principles.

However, Paxos became notorious for being nearly impossible to implement in production without extensive undocumented modifications. When Diego Ongaro and John Ousterhout introduced **Raft** in 2014, they set out to build an algorithm that matched Paxos in formal safety and efficiency while prioritizing human understandability.

**Core Differences in Architectural Design:**

1. **Leader Model:**
   - *Basic Paxos:* Leaderless and symmetric. Any node can act as a **Proposer** at any time. It achieves consensus on a single value through two phases: Phase 1 (Prepare/Promise) and Phase 2 (Propose/Accept). Multi-Paxos amortizes Phase 1 by electing a distinguished leader, but the leader can have holes in its log.
   - *Raft:* Strictly asymmetric with a **Strong Leader**. Log entries flow in only one direction: from the leader to followers. Followers never commit entries independently; they simply mirror the leader's log.
2. **Log Structure and Gaps:**
   - *Multi-Paxos:* Allows entries to be committed **out of order**. If round 5 stalls, rounds 6 and 7 can still be accepted, leaving "holes" in the log that must be filled later.
   - *Raft:* Strictly sequential and continuous. Raft prohibits holes in the log; if a follower's log diverges, the leader forces the follower to overwrite its log to match the leader's exact history.
3. **State Transitions & Elections:**
   - *Multi-Paxos:* Separates the election of a proposer from the log state. A newly elected leader may have an incomplete log and must query peers to discover past committed decisions.
   - *Raft:* Integrates elections with log completeness. A candidate cannot win an election unless its log contains all previously committed entries.

## See it
Compare Paxos and Raft across foundational architectural dimensions:

| Dimension | Multi-Paxos | Raft |
|---|---|---|
| **Primary Creator** | Leslie Lamport (1998 / 2001) | Diego Ongaro & John Ousterhout (2014) |
| **Leader Primacy** | Weak leader (proposals can originate anywhere) | Strong leader (all changes flow strictly through leader) |
| **Log Invariant** | Permits out-of-order commits and log holes | Strictly sequential; zero log holes permitted |
| **Leader Election** | Independent of log state | Restricted: candidate must hold all committed entries |
| **Comprehensibility** | Notoriously difficult; wide gap between theory and code | Highly structured; designed explicitly for teaching and implementation |
| **Canonical Systems** | Google Spanner, Google Chubby, Cassandra (LWT) | etcd (Kubernetes), HashiCorp Consul, CockroachDB |

```yaml
# Industry adoption mapping
consensus_implementations:
  paxos_family:
    google_spanner: "Multi-Paxos with TrueTime atomic clocks"
    apache_zookeeper: "Zab (ZooKeeper Atomic Broadcast - Paxos variant)"
  raft_family:
    etcd: "Raft (Powers all Kubernetes control plane state)"
    consul: "Raft (Service discovery and KV configuration)"
    cockroachdb: "Multi-Raft (Raft consensus per database range shard)"
```

> **Note:** In practical production performance, Multi-Paxos and Raft are functionally equivalent: both require 1 network round trip to commit a message during normal steady-state operation. Raft won widespread industry adoption simply because engineers could reason about its failure modes.

## Go deeper
CockroachDB uses **Multi-Raft**: rather than running one global Raft cluster for the entire multi-terabyte database, the database is split into thousands of 64 MB range shards. Each individual range shard runs its own separate 3-node or 5-node Raft consensus group in parallel!
## Watch out
- Do not assume Raft is "less powerful" than Paxos; formal proofs demonstrated that Raft and Multi-Paxos provide identical safety and throughput.
- Never attempt to implement Paxos from Lamport's original paper; read Mike Burrows' *Paxos Made Live* (Google) to understand the massive practical adaptations required.
## Remember
- Paxos is a generalized symmetric consensus protocol; Raft enforces a strong leader and sequential log.
- Raft eliminates log holes, ensuring entries commit in strict contiguous order.
- Industry modern infrastructure (Kubernetes/etcd, Consul) standardized on Raft for operational clarity.
