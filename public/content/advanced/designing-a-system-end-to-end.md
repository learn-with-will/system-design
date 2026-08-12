---
id: lesson-24
slug: designing-a-system-end-to-end
title: "Capstone: Designing a System End to End"
level: advanced
order: 24
duration: 32
tags:
  - capstone
  - framework
  - case-study
  - trade-offs
  - interview
---

# Learning Objectives

By the end of this lesson you will be able to:

- Apply a **repeatable framework** to any system design problem.
- Move from vague prompt to concrete architecture in a defensible order.
- Combine everything from this course — estimation, storage, caching, scaling, consistency, and resilience.
- Design a **URL shortener** end to end as a worked example.
- Present a design as a set of **trade-offs**, not a single "right" answer.

# Why It Matters

This is the payoff. Individually, the previous 23 lessons are tools; system design is
knowing **which** tools to reach for, **in what order**, for a given problem. This lesson
gives you a framework you can apply in an interview or a real design review, and walks it
end to end on a concrete example so you can see every earlier lesson click into place.

# Concept Explanation

### A repeatable framework

Almost every design problem yields to the same sequence. Resist the urge to jump straight to
boxes and arrows; the early steps decide the later ones.

```text
  1. Requirements   -> functional + non-functional  (Lesson 1)
  2. Estimate       -> QPS, storage, bandwidth       (Lesson 3)
  3. API            -> the contract                  (Lesson 5)
  4. Data model     -> what to store, in what store  (Lesson 6)
  5. High-level     -> the first simple architecture (Lessons 4, 8)
  6. Scale it       -> cache, replicate, partition   (Lessons 7, 9-11)
  7. Resilience     -> failure modes, redundancy     (Lessons 18, 21)
  8. Trade-offs     -> consistency, CAP, bottlenecks (Lessons 12-13)
```

1. **Clarify requirements.** What must it do (functional), and how well (non-functional:
   scale, latency, availability, consistency)? Ask questions; don't assume.
2. **Estimate scale.** Back-of-the-envelope QPS, storage, and bandwidth, with stated
   assumptions. This tells you whether you need one box or a fleet.
3. **Define the API.** The contract clients depend on — it frames everything.
4. **Model the data and pick storage.** Entities, access patterns, and the database family
   that fits.
5. **Draw the simplest high-level design** that meets the requirements: client → load
   balancer → stateless app → storage.
6. **Scale it to the numbers.** Add caching, read replicas, and partitioning **where the
   estimates demand it** — not everywhere.
7. **Design for failure.** Remove single points of failure; add redundancy, resilience
   patterns, and a recovery plan.
8. **State the trade-offs.** Consistency choices, CAP stance, and the current bottleneck.
   There is no single right answer — explain yours.

### Reading the problem: reads vs writes, and the hot path

Two questions shape most designs: **what's the read:write ratio**, and **what's the hot
path** (the operation that must be fast and frequent)? Optimize the hot path; everything else
can be simpler. A read-heavy system leans on caching and replicas; a write-heavy one leans on
partitioning and queues.

# Worked Example — Design a URL shortener

We'll run the whole framework on the URL shortener from Lessons 1 and 3.

### 1. Requirements

- **Functional:** shorten a long URL to a short one; visiting the short URL redirects to the
  original. (Optional: custom aliases, expiry, click analytics.)
- **Non-functional:** very **read-heavy** (redirects ≫ creations); redirects must be **fast**
  (tens of ms) and **highly available** (a dead link is very visible); the mapping must be
  **durable**.

### 2. Estimate (from Lesson 3)

```text
  100M new URLs/month  -> ~40 writes/sec
  read:write ~100:1    -> ~4,000 reads/sec average, ~8,000 peak
  5 years of URLs      -> ~6 billion, ~500 bytes each -> ~3 TB (x3 replication ~9 TB)
```

Verdict: writes are **modest**; the challenge is **read latency and availability at scale**.

### 3. API (from Lesson 5)

```http
POST /v1/urls        { "url": "https://example.com/very/long..." }
  -> 201 Created     { "short": "https://sho.rt/aZ3k9Q" }

GET /aZ3k9Q
  -> 301/302 redirect to the original URL
```

Creation is a `POST` (use an idempotency key to avoid duplicate entries on retry); redirects
are cacheable `GET`s.

### 4. Data model and storage (from Lesson 6)

The core is a tiny mapping: **short code → long URL** (plus created-at, optional owner/expiry).
Access is almost always **by key** (the short code), with no joins — a perfect fit for a
**key-value or simple relational** store. It's read-heavy, so a **cache** in front matters
more than the exact database.

**Generating the short code** is the interesting part:

- **Counter + Base62:** take a unique, ever-increasing id and encode it in Base62
  (`a–z A–Z 0–9`). Six Base62 characters give ~57 billion codes, seven give ~3.5 trillion —
  plenty for 6 billion URLs. Guarantees uniqueness, but a single global counter is a
  bottleneck, so hand out **id ranges/blocks** to each app server (or use a distributed id
  generator).
- **Hash + encode:** hash the long URL and take the first few Base62 characters. Simple, but
  you must **detect and resolve collisions**.

We'll use **counter + Base62 with per-server id ranges** — unique by construction and no hot
counter.

### 5. High-level design (from Lessons 4, 8)

```text
   Browser
      |  GET /aZ3k9Q            POST /v1/urls
      v
  +-----------------+   (redundant)
  |  Load Balancer  |
  +--------+--------+
           |
   +-------+--------+   stateless app servers (create + look up)
   |  App servers   |
   +---+--------+---+
       | read   | write
   +---v--+   +-v-----------+
   | Cache|   |  Database   |  short_code -> long_url
   +------+   +-------------+
```

Stateless app servers (Lesson 9) behind a redundant load balancer; a cache for redirects; a
durable database for the mapping.

### 6. Scale it to the numbers (from Lessons 7, 10, 11)

- **Cache the hot redirects** (Lesson 7). A small fraction of links get most of the traffic;
  serving them from an in-memory cache turns ~8,000 reads/sec into a trickle on the database
  and gives ~1 ms redirects. Short codes are immutable, so caching is easy (no invalidation
  headache) — set a long TTL.
- **Read replicas** (Lesson 10) absorb cache misses; redirects tolerate slight staleness, so
  eventually-consistent replicas are fine.
- **A CDN / edge** can cache redirects close to users, cutting cross-region latency (Lesson
  4).
- **Partitioning** (Lesson 11): at 6 billion rows you can shard by a **hash of the short
  code** if one database node isn't enough. It's key-based lookup, so hash partitioning fits
  perfectly.

### 7. Design for failure (from Lessons 18, 21)

- **Redundancy:** multiple load balancers, app servers across availability zones, a database
  with a replica and automatic failover, cache replicas.
- **Graceful behavior:** a cache miss falls back to the database; a replica lag just serves a
  redirect a beat late.
- **Backups** of the mapping (Lesson 21) — losing the short→long table would break every
  link, so keep tested backups, not just replication.

### 8. Trade-offs (from Lessons 12–13)

- **Consistency:** redirects can be **eventually consistent** (a new link appearing a second
  late is fine), so we favor **availability and low latency** — an **AP-leaning** choice
  under partition (Lesson 13). The one thing that needs care is **uniqueness** of generated
  codes, which the counter-based scheme guarantees by construction.
- **Bottleneck:** the design's pressure point is **read throughput/latency**, which is
  exactly what the cache, replicas, and CDN target. Writes are far from the limit.

That's a complete, defensible design — and every decision traces to a requirement and a
trade-off, which is the whole point.

# Real World Analogy

The framework is like an architect designing a building. You start with the **brief** (what
rooms, how many people, budget — requirements), do rough **sizing** (square footage, load —
estimation), draw the **floor plan** (API and high-level design), choose **materials** for the
loads they bear (storage and scaling), and engineer for **earthquakes and fire** (failure).
You never start by picking the doorknobs. And two architects can produce two good buildings —
what matters is that each choice is justified by the brief.

# Examples

## Example 1 — Basic: applying the framework to a pastebin

A "paste text, get a link" service is structurally the URL shortener with a bigger value.
Same framework: requirements (read-heavy, durable), estimate, a `POST`/`GET` API, key-value
storage, cache + replicas, redundancy. Reusing the framework makes a new problem familiar.

**Why this works:** the framework generalizes; many "design X" problems share a skeleton.

## Example 2 — Real-world: a news feed shifts the emphasis

Designing a social feed uses the same steps but different answers: the hard part is the
**write fan-out** (a post reaching millions of followers), so estimation exposes a
partitioning and queuing problem, and you weigh **fan-out-on-write vs on-read**. Same
framework, different bottleneck.

**Why this works:** the steps are constant; reading the read:write ratio and hot path tells
you *where* the difficulty is for this particular system.

## Example 3 — Trade-off / pitfall: skipping to the whiteboard

A candidate starts drawing microservices and Kafka before asking a single requirement or
estimating scale. They over-engineer a system for load that was never specified and miss the
actual constraint.

**Why this bites:** without requirements and estimates, you solve the wrong problem
impressively. The order of the framework exists for a reason.

# Common Mistakes

- **Jumping to architecture** before requirements and estimates. The early steps decide the
  later ones.
- **Ignoring the read:write ratio and hot path.** They tell you where to spend your design
  effort.
- **Over-engineering.** Add caching, sharding, and services **only where the numbers demand
  it**; simpler is better until it isn't.
- **Presenting one "right" answer.** Name the trade-offs and the current bottleneck; that's
  what a strong design communicates.
- **Forgetting failure.** A design isn't done until you've asked "what happens when each part
  fails?"

# Best Practices

- **Follow the framework in order**: requirements → estimate → API → data → high-level →
  scale → resilience → trade-offs.
- **Quantify** with back-of-the-envelope numbers and state assumptions.
- **Start simple**, then scale the specific bottleneck the numbers reveal.
- **Optimize the hot path** and let the rest stay simple.
- **Close with trade-offs**: consistency stance, CAP/PACELC leaning, and the bottleneck you'd
  tackle next.

# Summary

- Use a **repeatable framework**: **requirements → estimate → API → data model → high-level
  design → scale → resilience → trade-offs.**
- **Requirements and estimates come first** — they decide everything downstream. Read the
  **read:write ratio** and the **hot path** to find where the difficulty is.
- Build the **simplest design that meets the requirements**, then add **caching, replicas,
  and partitioning where the numbers demand** it, and **remove single points of failure**.
- Every real design is a set of **trade-offs** (consistency vs latency, simplicity vs scale) —
  present it that way, name the bottleneck, and justify your choices.
- The URL shortener shows the whole course working together; the same framework designs a
  pastebin, a feed, or a chat system — only the bottleneck changes.

# Flash Cards

Q: What is a good order of steps for designing a system?
A: Requirements → estimate scale → define the API → model the data and pick storage → draw the high-level design → scale it (cache, replicas, partitioning) → design for failure → state the trade-offs.

Q: Why do requirements and estimation come before drawing the architecture?
A: Because functional and non-functional requirements and the scale numbers decide the architecture; starting with boxes risks solving the wrong problem or over-engineering.

Q: What two questions most shape a design?
A: The read:write ratio and the hot path (the frequent, must-be-fast operation) — they tell you where to focus effort (caching/replicas for reads; partitioning/queues for writes).

Q: In the URL shortener, why can redirects be eventually consistent?
A: A newly created link appearing a moment late is acceptable, so favoring availability and low latency (an AP-leaning choice) is a fine trade-off; only code uniqueness needs a strong guarantee.

Q: Why generate short codes with a counter + Base62 and per-server id ranges?
A: Base62 encoding of a unique increasing id guarantees uniqueness with short codes; handing each server a range of ids avoids a single global counter becoming a bottleneck.

Q: How should you present a system design?
A: As a set of justified trade-offs with the current bottleneck named — not as a single 'right' answer — showing why each choice fits the requirements.

# Exercises

### Easy
Write the functional and non-functional requirements for a "paste text and share a link"
service, then estimate its write QPS given 2 million pastes per day.

### Medium
Apply steps 1–5 of the framework to a "design an image-hosting service" prompt: requirements,
a rough estimate, the API, the data model and storage choice, and a simple high-level
diagram.

### Challenging
Design a news-feed system end to end with the framework. Identify the hot path and bottleneck,
decide between fan-out-on-write and fan-out-on-read (with reasoning), and state your
consistency and failure-handling trade-offs. Where does this differ from the URL shortener,
and why?

# Further Reading

- Revisit this course's lessons in framework order — Lesson 1 (requirements), 3 (estimation),
  5 (APIs), 6 (storage), 7–11 (caching, scaling, replication, partitioning), 12–13
  (consistency, CAP), 18 & 21 (resilience).
- Martin Kleppmann, *Designing Data-Intensive Applications* — the whole book is a deep tour of
  the trade-offs this framework surfaces.
- Google, *Site Reliability Engineering* — https://sre.google/books/ — for operating what you
  design.
