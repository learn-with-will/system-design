---
id: lesson-10
slug: database-replication
title: "Database Replication"
level: intermediate
order: 10
duration: 26
tags:
  - replication
  - leader-follower
  - replication-lag
  - failover
  - high-availability
---

# Learning Objectives

By the end of this lesson you will be able to:

- Explain what **replication** is and the reasons to do it.
- Describe **leader–follower** replication and how reads and writes flow.
- Compare **synchronous**, **asynchronous**, and **semi-synchronous** replication.
- Explain **replication lag** and the read anomalies it causes.
- Describe **failover** and its hazards (lost writes, split brain).

# Why It Matters

One database server is a single point of failure and a single point of load. **Replication**
— keeping copies of the same data on multiple machines — is how systems stay available
when a machine dies, serve more reads, and keep data close to users. It's also where you
first meet the central tension of distributed data: copies drift apart, and keeping them
in sync trades against speed and availability.

# Concept Explanation

### Why replicate

- **High availability** — if one copy fails, others keep serving.
- **Read scaling** — spread read traffic across many copies (replicas).
- **Geographic proximity** — put a copy near users to cut latency.
- **Durability** — more copies means less chance of losing data to a single failure.

### Leader–follower replication

The most common scheme has one **leader** (also called primary) and one or more
**followers** (replicas):

```text
             writes
   Client ----------> [ Leader ] --- replicate ---> [ Follower 1 ]
                          |          the change  \-> [ Follower 2 ]
             reads can go to leader OR followers
```

- All **writes** go to the **leader**, which applies them and streams the changes to its
  followers.
- **Reads** can be served by the leader *or* the followers. Sending reads to followers
  scales read-heavy workloads — but introduces staleness (below).

### Synchronous vs asynchronous

When the leader gets a write, how long does it wait for followers before telling the
client "done"?

| Mode | Leader waits for… | Strength | Weakness |
| ---- | ----------------- | -------- | -------- |
| Synchronous | Follower(s) to confirm | No data loss if leader then dies | Slower; stalls if a follower is down |
| Asynchronous | Nothing — replies immediately | Fast; tolerates slow followers | Recent writes can be lost on failover |
| Semi-synchronous | At least one follower to confirm | A balance: one guaranteed copy | Still waits on that one follower |

Fully synchronous replication to *all* followers is rarely used, because one slow or down
follower would block every write. A common setup is **semi-synchronous**: one synchronous
follower (a guaranteed up-to-date copy) and the rest asynchronous.

### Replication lag and read anomalies

With asynchronous replication, followers are a little behind the leader — this delay is
**replication lag**. Reading from a lagging follower can produce confusing results
(these are *consistency* problems we'll formalize in the next lesson):

- **Read-your-writes:** a user updates their profile (write → leader), then reloads
  (read → a follower that hasn't caught up) and sees the *old* profile. Fix: read the
  user's *own* recent writes from the leader.
- **Monotonic reads:** two reads hit two followers with different lag, so data appears to
  *go backwards* in time. Fix: pin a user to one replica.

These anomalies are the price of scaling reads with asynchronous replicas; you manage
them, per use case.

### Failover and its hazards

If the leader fails, a follower must be promoted to leader — **failover**. It sounds
simple but is full of traps:

- **Lost writes:** with async replication, writes the old leader hadn't yet sent are gone.
- **Split brain:** the old leader wasn't actually dead (just unreachable), and now *two*
  nodes think they're leader and both accept writes — corrupting data. Systems use
  fencing/quorums to prevent this.
- **Detecting death:** deciding the leader is really dead relies on timeouts — too short
  and you fail over needlessly; too long and you're down longer.

Automatic failover is valuable but must be designed carefully; many outages are caused by
failover going wrong, not by the original fault.

### Beyond leader–follower

- **Multi-leader:** several leaders accept writes (e.g. one per data center). Great for
  multi-region writes, but concurrent writes to the same data **conflict** and must be
  resolved.
- **Leaderless:** any replica accepts reads and writes, using **quorums** to stay
  consistent (the Dynamo model). We cover quorums and consistency in the coming lessons.

# Key Terminology

- **Replication** — keeping copies of data on multiple nodes.
- **Leader (primary)** — the node that accepts writes and streams changes to followers.
- **Follower (replica)** — a node that receives the leader's changes and can serve reads.
- **Synchronous / asynchronous replication** — whether the leader waits for followers
  before acknowledging a write.
- **Replication lag** — how far behind a follower is from the leader.
- **Read-your-writes / monotonic reads** — guarantees about not seeing your own or the
  system's data go backwards.
- **Failover** — promoting a follower to leader after a leader failure.
- **Split brain** — two nodes acting as leader at once, accepting conflicting writes.

# Options and Trade-offs

| Decision | Option A | Option B | Trade-off |
| -------- | -------- | -------- | --------- |
| Where reads go | Leader only (fresh) | Followers (scalable) | Freshness vs read throughput |
| Replication timing | Synchronous | Asynchronous | Durability vs write latency |
| Leaders | Single-leader | Multi-leader | Simplicity vs multi-region writes + conflicts |
| Failover | Automatic | Manual | Fast recovery vs risk of a bad automatic decision |

# Worked Example

A read-heavy app (100:1 reads:writes) runs on one database that's overloaded on reads.
Add **leader–follower replication** with asynchronous followers:

```text
  writes (1%)  -> Leader
  reads  (99%) -> Follower1 / Follower2 / Follower3  (via a load balancer)
```

Read capacity multiplies. But now a user who edits their name and immediately reloads may
hit a follower that's 200 ms behind and see the old name — a **read-your-writes** failure.

The targeted fix: for a short window after a user writes, route *that user's* reads to the
**leader** (or to a follower known to be caught up), while everyone else keeps reading from
followers.

```text
  just wrote?  -> read from Leader for the next few seconds
  otherwise    -> read from a Follower
```

You kept the read-scaling benefit and repaired the one anomaly that users actually
notice — a very common production pattern.

# Real World Analogy

Leader–follower replication is like a head chef (the leader) writing the day's recipes and
couriers copying them to satellite kitchens (followers). Diners can be served from any
kitchen (reads scale). But if the head chef just changed a recipe and a courier hasn't
delivered the update yet, a satellite kitchen serves the old dish (replication lag). If the
head chef is suddenly unavailable, someone must be promoted — and if the old chef comes
back thinking they're still in charge, you get two chefs issuing conflicting recipes
(split brain).

# Examples

## Example 1 — Basic: scaling reads with replicas

A reporting dashboard runs heavy read queries. Pointing those queries at read replicas
keeps them off the leader, so writes and the app's own reads stay fast.

**Why this works:** replicas absorb read load; slightly stale data is fine for reporting.

## Example 2 — Real-world: a synchronous standby for durability

A payments database keeps one **synchronous** follower. Every committed write is
guaranteed to exist on at least two machines, so a leader crash can fail over without
losing a confirmed payment.

**Why this works:** the synchronous copy trades a little write latency for a guarantee
that money is never lost on failover.

## Example 3 — Trade-off / pitfall: async failover loses writes

A system uses fully asynchronous replication for speed. The leader crashes with 500
recent writes not yet replicated; failover promotes a follower and those writes vanish.

**Why this bites:** asynchronous replication acknowledges writes the followers don't have
yet. If those writes must survive, you need at least one synchronous copy.

# Common Mistakes

- **Reading your own writes from a lagging replica.** Route recent writers to the leader
  (or a caught-up replica) for a short window.
- **Assuming failover is safe and instant.** It can lose async writes and cause split
  brain; design fencing and test it.
- **Fully synchronous replication to all followers.** One slow follower stalls every
  write; prefer semi-synchronous.
- **Treating replicas as strongly consistent.** Asynchronous replicas are eventually
  consistent; don't rely on them for read-after-write correctness.

# Best Practices

- **Send reads to replicas** to scale, but handle **read-your-writes** for recent writers.
- **Keep at least one synchronous (or semi-sync) copy** when losing a confirmed write is
  unacceptable.
- **Design failover deliberately**: fencing to prevent split brain, sensible failure
  timeouts, and regular failover drills.
- **Monitor replication lag** and alert when it grows — lag is a leading indicator of read
  anomalies and failover risk.

# Summary

- **Replication** keeps copies of data on multiple nodes for availability, read scaling,
  proximity, and durability.
- In **leader–follower**, all writes go to the leader and stream to followers; reads can
  use followers to scale.
- **Synchronous** replication protects against data loss but adds latency; **asynchronous**
  is fast but can lose recent writes on failover; **semi-synchronous** balances the two.
- **Replication lag** causes read anomalies like read-your-writes and non-monotonic
  reads, which you fix per use case.
- **Failover** is hazardous — beware lost writes and **split brain** — and must be designed
  and tested, not assumed.

# Flash Cards

Q: In leader–follower replication, where do writes and reads go?
A: All writes go to the leader, which streams changes to followers; reads can be served by the leader or by followers (followers scale reads but may be stale).

Q: What is the trade-off between synchronous and asynchronous replication?
A: Synchronous waits for followers (no data loss on failover, but slower and stalls if a follower is down); asynchronous replies immediately (fast, but recent writes can be lost on failover).

Q: What is replication lag, and one problem it causes?
A: The delay before a follower catches up to the leader. It can cause a read-your-writes failure: you update data, then read a stale replica and see the old value.

Q: What is split brain?
A: When a failover promotes a new leader but the old leader is still active (just unreachable), so two nodes accept conflicting writes — corrupting data.

Q: How do you fix a read-your-writes anomaly in a replicated system?
A: For a short window after a user writes, route that user's reads to the leader (or a caught-up replica) so they see their own change.

Q: Why isn't fully synchronous replication to all followers common?
A: Because one slow or down follower would block every write; semi-synchronous (one synchronous follower, the rest async) is the usual compromise.

# Exercises

### Easy
List the four reasons to replicate a database, and for each, name a system that would
benefit (e.g., a global news site benefits from geographic proximity).

### Medium
A social app scales reads with three asynchronous replicas. Users report that after
posting, their new post sometimes doesn't appear when they refresh. Diagnose the cause and
propose a fix that keeps read scaling.

### Challenging
Design replication for a payments ledger that must never lose a confirmed transaction and
must fail over automatically within seconds. Specify the replication mode, how many copies,
how you prevent split brain, and what you monitor. State the trade-offs you accept.

# Further Reading

- Martin Kleppmann, *Designing Data-Intensive Applications*, Chapter 5 ("Replication").
- PostgreSQL documentation — "High Availability, Load Balancing, and Replication":
  https://www.postgresql.org/docs/current/high-availability.html
