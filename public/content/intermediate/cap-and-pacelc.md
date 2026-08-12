---
id: lesson-13
slug: cap-and-pacelc
title: "The CAP Theorem & PACELC"
level: intermediate
order: 13
duration: 26
tags:
  - cap-theorem
  - pacelc
  - consistency
  - availability
  - partition-tolerance
---

# Learning Objectives

By the end of this lesson you will be able to:

- State the **CAP theorem** precisely, with the real meaning of C, A, and P.
- Explain why "**pick 2 of 3**" is a misleading way to describe it.
- Describe the real choice a partition forces: **CP** vs **AP**.
- Explain how **PACELC** extends CAP to normal (non-partitioned) operation.
- Classify a system's leanings without overstating the theorem.

# Why It Matters

CAP is the most cited — and most *misquoted* — idea in distributed systems. The popular
"consistency, availability, partition tolerance: pick two" is a genuine oversimplification
that leads to wrong designs. This lesson gives you the accurate version, which is simpler
and more useful once you see it.

# Concept Explanation

### What C, A, and P actually mean

The **CAP theorem** was conjectured by Eric Brewer (2000) and proved by Gilbert & Lynch
(2002). Its three terms have precise definitions:

- **C — Consistency** here means **linearizability** (Lesson 12): every read sees the most
  recent write, as if there were a single copy. (This is *not* ACID's C.)
- **A — Availability** means **every request to a non-failing node receives a
  (non-error) response** — though not necessarily the latest data.
- **P — Partition tolerance** means the system keeps operating despite the network
  **dropping or delaying messages** between nodes (a **partition**).

### The precise statement (and why "2 of 3" misleads)

The theorem says: **when a network partition occurs, a distributed system must choose
between consistency and availability — it cannot have both.** That's it.

The "pick 2 of 3" framing is misleading because **you don't get to choose P**. Networks
*do* fail — cables cut, switches die, packets drop — so any real distributed system **must
tolerate partitions**. Partition tolerance isn't a menu option you trade away; it's a fact
of life. So the real question is only: **when a partition happens, which do you give up —
C or A?**

```text
  Partition happening?
        |
        +--> Choose Consistency (CP): refuse/block requests that can't be
        |     made consistent -> some requests get errors (sacrifice A)
        |
        +--> Choose Availability (AP): answer every request from the reachable
              side -> may return stale data (sacrifice C)
```

- A **CP** system keeps data consistent by **refusing to respond** on the side that can't
  guarantee freshness (it sacrifices availability during the partition).
- An **AP** system stays **available** by answering from whatever nodes are reachable,
  possibly with **stale** data (it sacrifices consistency during the partition).

### What about "CA"?

The old diagrams put "CA" (consistency + availability, giving up partition tolerance) as a
third option. But **"CA" is not a meaningful choice for a distributed system**, because you
can't opt out of partitions. A single, non-distributed database is trivially "CA" — there's
no network to partition — but the instant you distribute it, P is forced on you. Treat CAP
as a **C-vs-A choice that only matters during a partition**.

### Brewer's own clarification (CAP twelve years later)

In 2012 Brewer wrote "CAP Twelve Years Later" to correct the folklore. His points:

- The choice is **not global or permanent** — a system can choose C or A **per operation**,
  and even per data item.
- Partitions are (usually) **rare**, so **most of the time you get both C and A**. CAP only
  bites *during* a partition.
- The interesting engineering is **how a system detects a partition, what it sacrifices
  while partitioned, and how it recovers afterward.**

### PACELC: the part CAP leaves out

CAP only describes behavior **during a partition**. But even when everything is healthy,
there's a trade-off: keeping replicas strongly consistent requires **coordination**, which
costs **latency**. **PACELC** (Daniel Abadi, 2012) captures both situations:

> **If** there is a **P**artition, choose **A**vailability or **C**onsistency;
> **E**lse (normal operation), choose **L**atency or **C**onsistency.

```text
  P  ? -> A  or  C     (the CAP choice, during a partition)
  E (else) -> L or C   (the everyday latency-vs-consistency choice)
```

So a system is described by two letters, e.g. **PA/EL** (stay available under partition;
favor low latency otherwise) or **PC/EC** (stay consistent under partition; favor
consistency otherwise). PACELC is the fuller picture because it names the trade-off you
pay *every day*, not just during the rare partition.

# Key Terminology

- **CAP theorem** — during a partition, a distributed system must choose consistency or
  availability.
- **Consistency (CAP)** — linearizability: reads see the latest write.
- **Availability (CAP)** — every request to a non-failing node gets a non-error response.
- **Partition** — the network dropping/delaying messages between nodes.
- **CP system** — favors consistency under partition (may return errors).
- **AP system** — favors availability under partition (may return stale data).
- **PACELC** — extends CAP: during a Partition choose A/C; Else choose Latency/Consistency.

# Options and Trade-offs

| Situation | Choice | You get | You give up |
| --------- | ------ | ------- | ----------- |
| During a partition | CP | Consistent data | Availability (some errors) |
| During a partition | AP | Every request answered | Consistency (possible staleness) |
| Normal operation (PACELC's E) | EC | Strong consistency | Extra latency (coordination) |
| Normal operation (PACELC's E) | EL | Low latency | Weaker consistency |

# Worked Example

A key-value store is replicated across two data centers. A network link between them fails
— a **partition**. A write arrives at data center 1; a read for the same key arrives at
data center 2, which can no longer see data center 1's latest write.

**If the system is CP:** data center 2 recognizes it might be stale and **refuses** the
read (or the write), returning an error until the partition heals. Data stays correct;
some requests fail.

```text
  Partition!  DC2 can't confirm freshness -> return error (consistent, not available)
```

**If the system is AP:** data center 2 **answers anyway** with the value it has, which may
be **stale**. Every request succeeds; some answers are old. When the link heals, the two
sides **reconcile** (last-writer-wins, version vectors, or app logic).

```text
  Partition!  DC2 answers with stale value -> succeed now, reconcile later
```

Neither is "right" — it depends on the use case. A bank balance leans **CP** (better an
error than a wrong balance); a social feed leans **AP** (better a slightly stale feed than
an error). And under PACELC, even with the link *healthy*, the CP-leaning system pays more
**latency** to keep replicas in sync (EC), while the AP-leaning one answers faster from the
nearest replica (EL).

# Real World Analogy

Two shop branches share one stock ledger over a phone line. The line goes down (a
**partition**). A customer at branch B wants the exact live stock count. **CP** is the
manager saying "I can't confirm the number right now, come back later" — accurate but
unavailable. **AP** is the manager saying "we had 5 last I heard" — always an answer, but
possibly out of date. You literally cannot both guarantee the *live* number and always
answer while the line is down. When the line's up, keeping both ledgers perfectly in sync
still means a phone call per change (latency) — the everyday PACELC trade-off.

# Examples

## Example 1 — Basic: choosing AP for a shopping cart

An e-commerce cart favors availability: during a partition, let users keep adding items
(AP), and merge carts afterward. A brief inconsistency is far better than "cart
unavailable."

**Why this works:** availability drives revenue here, and cart conflicts are easy to
reconcile.

## Example 2 — Real-world: choosing CP for a lock or leader election

A system that grants a distributed lock (or elects a single leader) must be CP: during a
partition it would rather **refuse** than risk granting the lock to two clients. Consensus
systems used for coordination behave this way.

**Why this works:** correctness (only one holder) matters more than always answering;
handing the lock to two clients would be catastrophic.

## Example 3 — Trade-off / pitfall: "we chose CA"

A team claims their distributed database is "CA — consistent and available, we don't need
partition tolerance." Then a switch fails, the cluster partitions, and the system
neither stays consistent nor available in a defined way — it just breaks.

**Why this bites:** you can't opt out of partitions in a distributed system. "CA" isn't a
real design point; you must decide **CP or AP** ahead of time.

# Common Mistakes

- **Saying "pick 2 of 3."** P isn't optional for distributed systems; the real choice is
  C vs A *during a partition*.
- **Believing you sacrifice consistency or availability all the time.** CAP only applies
  *during* a partition; the rest of the time you can have both.
- **Choosing "CA."** Not meaningful for a distributed system — decide CP or AP.
- **Confusing CAP's C with ACID's C.** CAP's C is linearizability; ACID's C is integrity
  constraints.
- **Forgetting the everyday trade-off.** Even without partitions, strong consistency costs
  latency — that's PACELC's "else."

# Best Practices

- **Decide C-vs-A per feature, in advance**, for how the system behaves during a
  partition.
- **Lean CP** for correctness-critical data (money, locks, uniqueness); **lean AP** for
  availability-critical, reconcilable data (feeds, carts, view counts).
- **Use PACELC thinking**: also decide your latency-vs-consistency stance for normal
  operation.
- **Design partition recovery**: how the system detects a partition and reconciles
  afterward.
- **Speak precisely**: describe systems as CP/AP (and PA/EL etc.), not "CA."

# Summary

- **CAP:** during a network **partition**, a distributed system must choose **consistency**
  (linearizability) or **availability** (every request answered) — not both.
- "**Pick 2 of 3**" is misleading: **partition tolerance is mandatory** for distributed
  systems, so the real choice is **CP vs AP**, and only *during* a partition.
- "**CA**" is not a meaningful option once you're distributed.
- Brewer (2012): the choice can be **per operation**, partitions are **rare**, and recovery
  matters.
- **PACELC** adds the everyday trade-off: **else** (no partition), choose **latency** or
  **consistency**.

# Flash Cards

Q: State the CAP theorem precisely.
A: When a network partition occurs, a distributed system must choose between consistency (linearizability) and availability (every request to a non-failing node gets a response) — it cannot guarantee both.

Q: Why is "pick 2 of 3" a misleading description of CAP?
A: Because partition tolerance isn't optional — networks fail, so a distributed system must tolerate partitions. The real choice is C vs A, and only during a partition.

Q: What is the difference between a CP and an AP system during a partition?
A: A CP system sacrifices availability (it refuses/errors to stay consistent); an AP system sacrifices consistency (it answers with possibly stale data to stay available).

Q: Why is "CA" not a meaningful choice for a distributed system?
A: Because you can't opt out of network partitions. Only a single, non-distributed node is trivially CA; any distributed system must choose CP or AP.

Q: What does PACELC add to CAP?
A: It adds the normal-operation trade-off: if there's a Partition choose Availability or Consistency; Else choose Latency or Consistency — capturing that even without partitions, consistency costs latency.

Q: Is CAP's C the same as ACID's C?
A: No. CAP's C is linearizability (reads see the latest write); ACID's C is application integrity constraints. Different guarantees.

# Exercises

### Easy
For each, decide whether you'd lean CP or AP during a partition, and why: (a) an ATM
dispensing cash, (b) a "who's online" indicator, (c) a distributed lock.

### Medium
Explain to a teammate why "our database is CA" is not a valid claim for a multi-node
system. What must they decide instead, and what happens during a real partition?

### Challenging
Classify a design of your choice using PACELC (e.g., PA/EL or PC/EC). Describe its behavior
during a partition and its latency-vs-consistency stance in normal operation, and name one
feature where you'd override the default for a specific data item.

# Further Reading

- Seth Gilbert & Nancy Lynch, "Brewer's Conjecture and the Feasibility of Consistent,
  Available, Partition-Tolerant Web Services" (2002) — the CAP proof.
- Eric Brewer, "CAP Twelve Years Later: How the 'Rules' Have Changed" (IEEE Computer,
  2012).
- Daniel Abadi, "Consistency Tradeoffs in Modern Distributed Database System Design"
  (PACELC, 2012).
