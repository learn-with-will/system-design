---
slug: distributed-consensus-fundamentals
title: "Distributed Consensus Fundamentals"
topic: distributed-coordination
kind: concept
summary: "Why agreement is hard across asynchronous networks: the FLP theorem, quorum requirements, and safety invariants."
tags: [consensus, distributed-systems, flp-theorem, quorums]
related: [the-raft-consensus-algorithm, paxos-and-raft-compared, distributed-locks-and-leases]
---
> **In one line:** Distributed consensus allows a cluster of nodes to agree on a state or sequence of values even when some nodes fail or network links drop.

## The idea
In distributed systems, the **consensus problem** is the fundamental challenge of getting multiple independent server nodes to agree on a single data value or a sequence of state transitions (such as electing a leader, committing a transaction, or agreeing on the order of a distributed log).

Consensus sounds deceptively simple, but in an asynchronous network with unreliable hardware, it is exceptionally difficult:
- Messages can be delayed arbitrarily by congested switches.
- Packets can be lost, reordered, or duplicated.
- Server nodes can freeze temporarily due to garbage collection pauses, or crash permanently.
- Nodes can experience network partitions where they can talk to some servers but not others.

A consensus algorithm must satisfy two fundamental properties:
1. **Safety (Nothing Bad Happens):** All non-faulty nodes must agree on the same value, and the agreed value must have been proposed by a valid participant (no hallucinations or split-brain).
2. **Liveness (Something Good Eventually Happens):** Every non-faulty node eventually decides upon a value; the system does not hang or deadlock indefinitely.

**The Majority Quorum Rule:**
Consensus algorithms (Raft, Paxos, Zab) rely on **majority quorums**. To tolerate $f$ node failures, a cluster must contain at least **$2f + 1$ total nodes**:
- A 3-node cluster can tolerate $f = 1$ failure (majority quorum: 2 nodes).
- A 5-node cluster can tolerate $f = 2$ failures (majority quorum: 3 nodes).
- A 7-node cluster can tolerate $f = 3$ failures (majority quorum: 4 nodes).

Why odd numbers? Any two majorities of $2f + 1$ are guaranteed to overlap in at least one node by mathematical pigeonhole principle ($(\lfloor N/2 \rfloor + 1) + (\lfloor N/2 \rfloor + 1) > N$). That overlapping node ensures that the new majority always knows about any previously committed decision!

## See it
Compare quorum requirements and fault tolerance across cluster sizes:

| Total Nodes ($N$) | Majority Quorum Needed ($\lfloor N/2 \rfloor + 1$) | Max Node Failures Tolerated ($f$) | Why an Odd Number? |
|---|---|---|---|
| **1 Node** | 1 | 0 | Single Point of Failure |
| **2 Nodes** | 2 | 0 | 1 failure stalls cluster (2/2 = 100% required) |
| **3 Nodes** | 2 | 1 | Tolerate 1 dead node with 2-node majority |
| **4 Nodes** | 3 | 1 | Still tolerates only 1 failure; extra node adds zero resilience! |
| **5 Nodes** | 3 | 2 | The production standard: survives 2 node failures |

```flow
n1: Node A (Leader) | Active @primary
n2: Node B (Follower) | Active @green
n3: Node C (Follower) | Active @green
n4: Node D (Dead) | Crashed hardware @red
n5: Node E (Dead) | Network severed @red
n1 -> n2: Quorum active (3 of 5)
n2 -> n3: State replicated
n1 -> n3: Safety preserved
```

```yaml
# Production consensus cluster configuration (etcd)
etcd_cluster_size: 5
quorum_required: 3
tolerated_failures: 2
recommendation: "Never run an even number of consensus nodes; 4 nodes has the exact same fault tolerance as 3 nodes!"
```

> **Note:** A 4-node cluster requires 3 nodes for a majority. If 2 nodes fail, the remaining 2 nodes cannot form a majority (2 < 3). Thus, 4 nodes tolerates only 1 failure—identical to 3 nodes! Running an even number of nodes wastes hardware and increases network partition risks.

## Go deeper
The **FLP Impossibility Theorem** (Fischer, Lynch, Paterson, 1985) proved that in a purely asynchronous network, no deterministic consensus protocol can guarantee 100% liveness if even a single node can crash. Real-world protocols achieve liveness by introducing partial synchrony assumptions: using randomized heartbeat timers to detect suspected node crashes.
## Watch out
- Never deploy an even number of nodes (e.g., 2, 4, 6) in a consensus cluster (etcd, ZooKeeper, Consul); always use odd numbers (3, 5).
- Do not attempt to write your own custom consensus protocol for production; use battle-tested implementations like Raft (etcd) or Paxos.
## Remember
- Consensus ensures multiple nodes agree on state even in the face of node crashes and network drops.
- A cluster of $2f + 1$ nodes can tolerate $f$ failures by relying on majority quorums.
- Always deploy an odd number of consensus nodes (typically 3 or 5) to maximize fault tolerance.
