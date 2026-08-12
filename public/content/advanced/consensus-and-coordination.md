---
id: lesson-20
slug: consensus-and-coordination
title: "Consensus & Coordination"
level: advanced
order: 20
duration: 28
tags:
  - consensus
  - raft
  - paxos
  - quorum
  - coordination
---

# Learning Objectives

By the end of this lesson you will be able to:

- Explain what **consensus** is and why distributed systems need it.
- Explain why consensus is fundamentally hard.
- Define a **quorum** and the majority rule.
- Describe how **Raft** does leader election and log replication.
- Say what coordination services like **ZooKeeper** and **etcd** provide.

# Why It Matters

Again and again, distributed systems need a set of nodes to **agree** on one thing despite
crashes and network trouble: who is the leader, whether a transaction committed, who holds a
lock, what the current configuration is. That agreement is **consensus**, and it underpins
replicated databases, leader election, distributed locks, and configuration systems. It's
also famously subtle — which is why we lean on a few proven algorithms rather than rolling
our own.

# Concept Explanation

### What consensus is

**Consensus** is getting multiple nodes to **agree on a single value** (or a single ordered
sequence of values) even when some nodes fail or messages are lost. A correct consensus
algorithm guarantees:

- **Agreement:** all non-faulty nodes decide the **same** value.
- **Validity:** the decided value was actually proposed by some node.
- **Termination:** non-faulty nodes eventually decide (make progress).

Consensus is the building block for **replicated state machines**: if every replica applies
the **same commands in the same order**, they all end up in the same state — which is exactly
how consistent replicated systems are built.

### Why consensus is hard

Getting nodes to agree sounds simple until you add failures. A deep result — the **FLP
impossibility** (Fischer, Lynch, Paterson) — proves that in a **fully asynchronous** system
(no bound on message delay) where even **one** node may crash, **no deterministic algorithm
can guarantee it will always reach consensus**. Real systems get around this by assuming
**partial synchrony** — using **timeouts** to suspect failed nodes — and sometimes
randomization. So consensus is achievable in practice, but only by making reasonable timing
assumptions, which is why the algorithms are careful and worth reusing rather than
reinventing.

### Quorums and the majority rule

Most consensus algorithms make progress using a **quorum** — a **majority** of nodes,
⌊N/2⌋+1. With **2f + 1** nodes you can tolerate **f** failures and still have a majority
available. Two majorities always **overlap** in at least one node, which is what prevents two
conflicting decisions.

```text
  5 nodes, majority = 3, tolerates 2 failures
  Any two majorities of a 5-node set share at least one node -> no split decisions
```

This is why consensus clusters run an **odd** number of nodes (3, 5, 7): 5 nodes tolerate 2
failures, while 4 nodes also only tolerate 1 — the extra node buys nothing but cost.

> A related idea appears in leaderless (Dynamo-style) replication: with N replicas, W write
> and R read replicas, choosing **W + R > N** forces read and write sets to overlap so reads
> see the latest write. It's the same "majorities overlap" intuition applied to reads and
> writes.

### Raft: consensus you can understand

**Raft** (Ongaro & Ousterhout, "In Search of an Understandable Consensus Algorithm") was
designed to be graspable. It elects **one leader** that owns the process:

**Leader election.** Nodes start as **followers**. If a follower hears no heartbeat from a
leader within a randomized **election timeout**, it becomes a **candidate**, increments the
**term** (a logical clock), and requests votes. A candidate that wins a **majority** becomes
**leader** and sends heartbeats. Randomized timeouts make it unlikely two candidates tie
repeatedly.

```text
  follower --(no heartbeat)--> candidate --(wins majority of votes)--> leader
     ^                                                                   |
     +----------------- (discovers a higher term) <---------------------+
```

**Log replication.** All client writes go to the leader, which appends them to its **log** and
replicates to followers. Once an entry is stored on a **majority**, it is **committed** and
applied to the state machine. A safety rule — only a candidate whose log is at least as
up-to-date as a majority can be elected — guarantees committed entries are never lost.

### Paxos and the alternatives

**Paxos** (Leslie Lamport, "Paxos Made Simple") is the original, proven consensus algorithm.
It's correct but notoriously hard to understand and to implement in its multi-decision form —
which is exactly why Raft was created as an easier-to-understand alternative that provides
the same guarantees. Both are used in real systems; you rarely implement either yourself.

### Coordination services

Because consensus is hard, most teams use a ready-made **coordination service** rather than
building one. **ZooKeeper** and **etcd** provide consensus-backed primitives:

- **Leader election** and membership.
- **Distributed locks** and coordination.
- **Configuration** and small, strongly-consistent metadata storage.
- **Service discovery** support.

etcd (which uses Raft) is the coordination store behind **Kubernetes**; ZooKeeper has long
served the same role for many data systems. When you need distributed agreement, reach for
one of these instead of writing your own.

# Key Terminology

- **Consensus** — agreeing on a single value/sequence despite failures (agreement, validity,
  termination).
- **Replicated state machine** — replicas that apply the same commands in the same order stay
  identical.
- **FLP impossibility** — no deterministic algorithm guarantees consensus in a fully
  asynchronous system with one possible crash.
- **Quorum / majority** — ⌊N/2⌋+1 nodes; 2f+1 nodes tolerate f failures.
- **Term (Raft)** — a logical clock that increments each election.
- **Leader election / log replication** — Raft's two core mechanisms.
- **Coordination service** — ZooKeeper/etcd: consensus-backed leader election, locks, config.

# Options and Trade-offs

| Choice | Option | Trade-off |
| ------ | ------ | --------- |
| Cluster size | 3 nodes | Tolerates 1 failure; cheaper, less resilient |
| Cluster size | 5 nodes | Tolerates 2 failures; more resilient, more cost/latency |
| Algorithm | Paxos | Proven, but hard to understand/implement |
| Algorithm | Raft | Same guarantees, understandable — common choice |
| Build vs buy | Use etcd/ZooKeeper | Proven and maintained vs rolling your own (don't) |

# Worked Example

You need **leader election** for a service where exactly **one** instance must be the active
processor (a singleton scheduler), with automatic failover if it dies. Rolling your own is a
trap — split-brain and edge cases abound. Instead, use a **consensus-backed coordination
service** (etcd/ZooKeeper) running **5 nodes**.

```text
  5-node etcd cluster (majority = 3, tolerates 2 failures)
    - scheduler instances compete for a leader lease via etcd
    - exactly one wins the lease -> becomes active
    - if the leader dies, its lease expires; a majority elects a new leader
    - a partitioned old leader can't renew its lease (no majority) -> steps down
```

The majority-quorum rule is what makes this safe: a leader must hold a lease backed by a
majority, so a partitioned minority **cannot** also believe it's leader — no split brain.
You got correct, automatic, single-leader failover **without** implementing consensus
yourself. That's the whole point of coordination services.

# Real World Analogy

Consensus is a committee agreeing on one decision when some members are absent or the phone
lines are patchy. The **majority (quorum)** rule is "a motion needs more than half the
members to pass" — and because any two majorities share at least one member, you can never
pass two contradictory motions. **Raft** is electing a single **chairperson** who records
decisions in a minute book (the log) that everyone copies; if the chair goes silent, the
members hold a quick election for a new one. **Paxos** is a correct but confusingly-worded
version of the same bylaws that few can read without a headache.

# Examples

## Example 1 — Basic: an odd-sized cluster

A team runs etcd with 3 nodes: it tolerates 1 failure and keeps a majority (2 of 3). Growing
to 5 tolerates 2 failures. They never use 4 — it tolerates only 1, same as 3, for more cost.

**Why this works:** odd sizes maximize fault tolerance per node because a majority of an odd
set survives the most failures for the price.

## Example 2 — Real-world: Kubernetes on etcd

Kubernetes stores all cluster state in **etcd**, which uses Raft to keep a consistent,
replicated record across its nodes. The control plane relies on that consensus for a single,
agreed view of the cluster.

**Why this works:** the platform delegates the hard consensus problem to a proven,
Raft-backed store rather than reinventing it.

## Example 3 — Trade-off / pitfall: rolling your own leader election

A team implements "leader election" with a database flag and timeouts. During a network
partition, two nodes both think they're leader and both act — split brain, corrupting data.

**Why this bites:** correct leader election requires majority-quorum consensus. A homegrown
flag lacks the overlap guarantee, so a partition produces two leaders. Use a coordination
service.

# Common Mistakes

- **Rolling your own consensus.** It's subtle and easy to get wrong (split brain); use etcd
  or ZooKeeper.
- **Even-sized clusters.** 4 nodes tolerate the same failures as 3 but cost more; use odd
  sizes.
- **Assuming a lone node can "know" it's still leader** during a partition. Without a majority
  lease it must step down.
- **Confusing replication with consensus.** Consensus provides the *agreement/ordering* that
  strongly-consistent replication is built on.
- **Ignoring the latency cost.** Consensus needs a majority round trip per decision — don't
  put it in a hot path that needs microseconds.

# Best Practices

- **Use a proven coordination service** (etcd, ZooKeeper) for leader election, locks, and
  config — don't build consensus yourself.
- **Run an odd number of nodes** (3, 5, 7) sized to the failures you must tolerate.
- **Keep consensus off the hot path**; it costs a majority round trip. Use it for control
  decisions, not per-request work.
- **Understand your quorum**: know how many failures your cluster tolerates and what happens
  under partition.
- **Prefer Raft-based systems** when you want understandable, auditable behavior.

# Summary

- **Consensus** is agreeing on one value/sequence despite failures — the basis of leader
  election, atomic commit, locks, and replicated state machines.
- It's fundamentally hard (**FLP**: impossible to guarantee in a fully asynchronous system
  with a crash), so real systems use **timeouts** and **quorums**.
- A **quorum** is a majority (⌊N/2⌋+1); **2f+1** nodes tolerate **f** failures, and
  overlapping majorities prevent split decisions — so clusters run **odd** sizes.
- **Raft** elects one **leader** (via randomized election timeouts and majority votes) and
  replicates a **log**, committing entries stored on a majority; **Paxos** is the original,
  harder-to-grasp equivalent.
- Use coordination services (**etcd**, **ZooKeeper**) rather than building consensus
  yourself.

# Flash Cards

Q: What is consensus in a distributed system?
A: Getting multiple nodes to agree on a single value (or ordered sequence) despite failures, guaranteeing agreement, validity, and termination.

Q: What does the FLP impossibility result say?
A: In a fully asynchronous system where even one node may crash, no deterministic algorithm can guarantee it always reaches consensus. Real systems work around it with timeouts (partial synchrony) and sometimes randomization.

Q: What is a quorum, and how many failures can 2f+1 nodes tolerate?
A: A quorum is a majority (⌊N/2⌋+1). A cluster of 2f+1 nodes tolerates f failures while still having a majority available. Overlapping majorities prevent conflicting decisions.

Q: How does Raft elect a leader?
A: Followers that hear no heartbeat within a randomized election timeout become candidates, increment the term, and request votes; a candidate that wins a majority becomes leader and sends heartbeats.

Q: Why run consensus clusters with an odd number of nodes?
A: Because a majority of an odd set tolerates the most failures per node — 5 nodes tolerate 2 failures, while 4 nodes also tolerate only 1, for more cost.

Q: Should you implement your own leader election? Why or why not?
A: No — correct leader election needs majority-quorum consensus to avoid split brain. Use a proven coordination service like etcd or ZooKeeper.

# Exercises

### Easy
A consensus cluster must tolerate 2 simultaneous node failures. How many nodes do you need,
and what is the majority quorum? Why not use 4 nodes?

### Medium
Explain, in the two mechanisms of Raft, how a committed log entry is guaranteed not to be
lost even if the leader crashes right after committing it.

### Challenging
You need a distributed lock so exactly one worker processes a job at a time, with automatic
failover. Explain why a database boolean flag is unsafe under a network partition, and design
a correct solution using a coordination service. What guarantees prevent two workers from
holding the lock at once?

# Further Reading

- Diego Ongaro & John Ousterhout, "In Search of an Understandable Consensus Algorithm
  (Raft)" (USENIX ATC 2014) — https://raft.github.io/
- Leslie Lamport, "Paxos Made Simple" (2001).
- etcd documentation — https://etcd.io/docs/ ; Martin Kleppmann, *DDIA*, Chapter 9
  ("Consistency and Consensus").
