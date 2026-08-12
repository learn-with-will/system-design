---
id: lesson-12
slug: consistency-models
title: "Consistency Models"
level: intermediate
order: 12
duration: 28
tags:
  - consistency
  - linearizability
  - eventual-consistency
  - serializability
  - causal-consistency
---

# Learning Objectives

By the end of this lesson you will be able to:

- Explain what "consistency" means for replicated data (and how it differs from ACID's C).
- Define **strong consistency (linearizability)** and **eventual consistency**.
- Name the useful in-between guarantees: **read-your-writes**, **monotonic reads**, **causal**.
- Explain the crucial difference between **linearizability** and **serializability**.
- Reason about the cost of stronger consistency.

# Why It Matters

The moment you have more than one copy of data (replication, caching, partitions), a
question appears: **when I read, which value am I allowed to get back?** The answer is the
system's **consistency model** — a precise contract about what reads may return in the
presence of concurrent writes. Get the model wrong and you build features on guarantees
you don't actually have. This lesson is also the groundwork for CAP, next.

# Concept Explanation

### Two meanings of "consistency" — don't mix them up

The word is overloaded:

- The **C in ACID** (Lesson 6) means the database preserves the **integrity constraints**
  the application defines. It's largely the application's responsibility.
- **Consistency here** (the "C" in CAP, next lesson) is about **replication**: given
  concurrent writes and multiple copies, which values may a read return?

They are different ideas. This lesson is about the second one.

### Strong consistency (linearizability)

**Linearizability** (also called strong consistency or atomic consistency) makes a
replicated system **behave as if there were a single, up-to-date copy**. Formally: every
operation appears to take effect **instantaneously at some point** between its start and
end, and **once a write completes, every later read — by anyone — returns that write (or a
newer one)**. It is a **recency** guarantee: no reader ever sees stale data, and the whole
system agrees on a single, real-time order of operations.

That's the strongest, most intuitive model — it's what a single machine gives you for
free — but across replicas it requires coordination on every operation, which costs
latency and, under a network partition, availability.

### Eventual consistency

At the other end, **eventual consistency** promises only that **if writes stop, all
replicas eventually converge** to the same value. In the meantime, different reads may
return different, stale values, and there's **no recency guarantee**. In exchange you get
low latency and high availability — reads and writes can hit the nearest replica without
waiting for the others. Many large, always-on systems (in the spirit of Amazon's Dynamo)
choose this.

### The useful middle ground

Between "always fresh" and "eventually the same" are **client-centric** guarantees that
fix the anomalies users actually notice (you met two of these under replication lag):

| Guarantee | Promise |
| --------- | ------- |
| Read-your-writes | You always see your **own** most recent writes |
| Monotonic reads | You never see data **go backwards** in time across successive reads |
| Consistent prefix | You see writes in an order that respects cause and effect |
| Causal consistency | Operations that are causally related are seen in the same order by everyone |

**Causal consistency** is especially important: it preserves cause-and-effect (a reply
never appears before the message it answers) and is **the strongest model still achievable
while staying highly available during a partition**.

### Linearizability vs serializability — the classic mix-up

These sound alike and are constantly confused, but they are **different, independent**
guarantees:

- **Linearizability** is a **recency** guarantee about **single-object** reads and writes.
  It concerns **real-time order**: once a write finishes, reads see it. It's a
  *consistency* model. It says nothing about transactions.
- **Serializability** is an **isolation** guarantee about **transactions** (which may touch
  many objects). It promises the result is **as if** transactions ran **one at a time in
  some serial order** — but that order need **not** match real time. It's a *transaction
  isolation* level (Lesson 6's "I" in ACID). It says nothing about recency of a single
  object across replicas.

> **Linearizability ≠ serializability.** One is about seeing the latest value of an object
> in real time; the other is about transactions appearing to run in *some* serial order.
> Combine both and you get **strict serializability** (serial order *and* real-time
> order) — the strongest guarantee, and the most expensive.

# Key Terminology

- **Consistency model** — the contract for what a read may return given concurrent writes.
- **Linearizability (strong consistency)** — the system behaves like one up-to-date copy;
  reads see the latest write; a recency guarantee on single objects.
- **Eventual consistency** — replicas converge if writes stop; stale reads allowed
  meanwhile.
- **Read-your-writes** — you always see your own writes.
- **Monotonic reads** — successive reads never move backward in time.
- **Causal consistency** — causally related operations are seen in the same order
  everywhere.
- **Serializability** — transactions appear to run one at a time in some serial order (an
  isolation level).
- **Strict serializability** — serializability plus linearizability (serial + real-time
  order).

# Options and Trade-offs

| Model | You get | You give up |
| ----- | ------- | ----------- |
| Linearizable (strong) | Always-fresh reads; one global order | Higher latency; less availability under partition |
| Causal | Cause-effect order; stays available | Not fully "latest" for unrelated data |
| Read-your-writes / monotonic | Fixes the anomalies users notice | Still not globally fresh |
| Eventual | Lowest latency; highest availability | Stale reads; must reconcile conflicts |

# Worked Example

Two users interact with a replicated comment system. Alice posts a comment; Bob replies to
it. A third user, Carol, reads the thread from a different replica.

**Under eventual consistency**, Carol's replica might have received Bob's reply but not yet
Alice's original comment — so Carol sees a reply to a comment that "doesn't exist yet."

```text
  Alice writes: C1  "Anyone up for lunch?"
  Bob writes:   C2  (reply to C1) "Yes! Noon?"
  Carol reads from a lagging replica:
     sees C2 but not C1  ->  a reply with no original (violates cause -> effect)
```

**Under causal consistency**, the system guarantees that because C2 causally depends on
C1, no one sees C2 without C1. Carol either sees both or sees neither in the wrong order —
never the nonsensical version.

```text
  Causal guarantee: C1 "happens-before" C2, so every reader sees C1 before C2.
```

We didn't need full linearizability (which would also force a single global real-time
order and cost more) — we needed **causal** consistency, exactly enough to keep replies
after their comments. Choosing the *weakest model that still makes the feature correct* is
the skill.

# Real World Analogy

Consistency models are like group chats syncing across phones. **Linearizability** is a
perfect world where the instant anyone sends a message, every phone shows it immediately,
in one true order. **Eventual consistency** is the real world: messages arrive on
different phones at slightly different times, and if everyone stops typing, all phones
eventually match. **Causal consistency** is the guarantee that you never see a reply before
the message it answers — even if some other, unrelated message is still in flight.

# Examples

## Example 1 — Basic: eventual consistency for a like counter

A "likes" count is shown from whichever replica is nearest. It might read 1,004 on one
device and 1,006 on another for a few seconds, then agree.

**Why this works:** a slightly stale like count harms nothing, and eventual consistency
buys low latency and high availability.

## Example 2 — Real-world: linearizability for a unique username check

"Is this username taken?" must be linearizable: if two people register the same name at
once, exactly one can win, and the check must see the very latest state. Eventual
consistency could let both succeed.

**Why this works:** correctness here depends on a single, up-to-date view — precisely what
linearizability provides (at the cost of coordination).

## Example 3 — Trade-off / pitfall: assuming replicas are strongly consistent

A developer scales reads with async replicas, then builds a "read your just-saved
settings" flow assuming reads are fresh. Users see old settings right after saving.

**Why this bites:** async replicas are eventually consistent, not linearizable. The
feature needed read-your-writes, which must be arranged explicitly (read from the leader,
or a caught-up replica).

# Common Mistakes

- **Confusing ACID's "C" with replication consistency.** They're different guarantees.
- **Confusing linearizability and serializability.** One is single-object recency; the
  other is transaction isolation. They're independent.
- **Assuming replicas are strongly consistent.** Most are eventually consistent by default;
  don't build recency-dependent features on them.
- **Over-choosing linearizability.** It's the most expensive model; many features are
  correct with causal or read-your-writes.
- **Ignoring convergence/conflicts under eventual consistency.** You must decide how
  concurrent writes reconcile.

# Best Practices

- **Pick the weakest consistency model that still makes the feature correct** — it's
  usually the cheapest and most available.
- **Reserve linearizability for things that truly need a single fresh view** (uniqueness,
  locks, balances-that-must-not-go-negative).
- **Use causal consistency** when cause-and-effect ordering matters (threads, messaging).
- **State the model per feature**, and design read routing (leader vs replica) to match.
- **Plan conflict resolution** wherever you accept eventual consistency.

# Summary

- A **consistency model** is the contract for what a read may return under concurrent
  writes — distinct from ACID's "C."
- **Linearizability (strong)** makes the system look like one up-to-date copy: reads always
  see the latest write, at the cost of coordination, latency, and availability.
- **Eventual consistency** only promises replicas converge eventually; it's fast and
  available but allows stale reads.
- Useful middles — **read-your-writes, monotonic reads, causal** — fix real anomalies;
  causal is the strongest that stays available under partition.
- **Linearizability ≠ serializability**: single-object recency vs transaction isolation;
  both together is **strict serializability**.

# Flash Cards

Q: What does linearizability (strong consistency) guarantee?
A: The system behaves as if there is one up-to-date copy: once a write completes, every later read returns that write or a newer one. It is a recency guarantee on single objects.

Q: What does eventual consistency promise?
A: Only that if writes stop, all replicas eventually converge to the same value. In the meantime, reads may be stale.

Q: How do linearizability and serializability differ?
A: Linearizability is a recency guarantee on single-object reads/writes (real-time order); serializability is a transaction-isolation guarantee that transactions appear to run one at a time in some serial order. They are independent; both together is strict serializability.

Q: What does causal consistency preserve, and why is it notable?
A: It preserves cause-and-effect ordering (no effect seen before its cause) and is the strongest model still achievable while staying highly available during a partition.

Q: Why not always choose linearizability?
A: It is the most expensive model — it requires coordination on every operation, raising latency and lowering availability under partition. Many features are correct with a weaker model.

Q: Is the "C" in ACID the same as the "C" in CAP?
A: No. ACID's C is about application integrity constraints; CAP's C is linearizability (a replication recency guarantee). Different ideas.

# Exercises

### Easy
For each feature, name the weakest consistency model that keeps it correct: (a) a public
view counter, (b) reserving the last seat on a flight, (c) showing a chat reply after its
message.

### Medium
Explain, in your own words, why linearizability and serializability are different. Give one
example where you need linearizability but not transactions, and one where you need
serializable transactions.

### Challenging
You're designing a shopping cart replicated across regions for high availability. Choose a
consistency model. How do you handle two devices adding items to the same cart at once
(concurrent writes)? What converges, and what could a user briefly see?

# Further Reading

- Martin Kleppmann, *Designing Data-Intensive Applications*, Chapter 5 (replication and
  read-your-writes/monotonic reads) and Chapter 9 ("Consistency and Consensus" —
  linearizability vs serializability).
- Jepsen — https://jepsen.io/consistency — a clear map of consistency models and how they
  relate.
