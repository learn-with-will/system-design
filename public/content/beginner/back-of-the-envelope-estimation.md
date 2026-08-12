---
id: lesson-03
slug: back-of-the-envelope-estimation
title: "Back-of-the-Envelope Estimation"
level: beginner
order: 3
duration: 24
tags:
  - estimation
  - capacity-planning
  - latency-numbers
  - qps
  - storage
---

# Learning Objectives

By the end of this lesson you will be able to:

- Use **powers of two** and common data-size units fluently.
- Recall the **latency numbers** every engineer should know — as approximate orders of magnitude.
- Estimate **queries per second (QPS)**, **storage**, and **bandwidth** from stated assumptions.
- Separate **average** load from **peak** load.
- Show your assumptions so an estimate can be checked and defended.

# Why It Matters

You will constantly need rough answers to "how many servers?", "how much storage?",
"will this fit in memory?" — often before any code exists. **Back-of-the-envelope
estimation** gets you an answer that is right to within an order of magnitude in a
minute or two. The goal is not precision; it is catching bad ideas early ("that would
need 50 petabytes — let's rethink") and sizing the design.

# Concept Explanation

### Powers of two and data units

Computers count in powers of two, and each ~10 powers is a new unit:

| Power | Approx | Unit | Rough meaning |
| ----- | ------ | ---- | ------------- |
| 2^10 | ~1 thousand | KB | a short email |
| 2^20 | ~1 million | MB | a photo |
| 2^30 | ~1 billion | GB | a movie |
| 2^40 | ~1 trillion | TB | a large database |
| 2^50 | ~1 quadrillion | PB | a big company's data |

A second useful shortcut: **a day is about 86,400 seconds ≈ 10^5 seconds.** That single
fact turns "per day" into "per second" quickly.

### Latency numbers every engineer should know

These approximate figures come from Jeff Dean and Peter Norvig and are widely used for
sizing. **They are orders of magnitude, not exact specs, and they drift over time** — but
the *ratios* between them are the point:

```text
  L1 cache reference .......................... ~1 ns
  Main memory reference ....................... ~100 ns      (~100x slower than L1)
  Read 1 MB sequentially from memory .......... ~10-100 us
  Round trip within the same data center ...... ~0.5 ms
  Read 4 KB randomly from an SSD .............. ~10-100 us
  Read 1 MB sequentially from an SSD .......... ~1 ms
  Disk seek (spinning disk) ................... ~10 ms
  Read 1 MB sequentially from a spinning disk . ~20-30 ms
  Round trip California <-> Europe <-> back ... ~150 ms
```

The lessons you should carry away: **memory is far faster than SSD, which is far faster
than a spinning disk; a cross-continent round trip (~150 ms) dwarfs almost everything
local; and a same-data-center round trip (~0.5 ms) is cheap by comparison.** This is
*why* we cache in memory and put content near users.

### Estimating load: average vs peak

To size a system, estimate **QPS** (queries, or requests, per second):

```text
  QPS (average)  =  (daily active users x actions per user per day) / 86,400
  QPS (peak)     =  QPS (average) x a peak factor (often 2-3x)
```

Traffic is never flat, so always size for the **peak**, not the average. Read-heavy
systems also need a **read:write ratio** — many systems do far more reads than writes,
and that ratio decides where caching and read replicas go.

### Estimating storage and bandwidth

```text
  Storage   =  number of items x size per item x retention x replication factor
  Bandwidth =  QPS x average payload size
```

Round generously and keep the units straight. An estimate that is off by 2x is fine; one
that is off by 1000x means you misjudged the design.

# Key Terminology

- **Back-of-the-envelope estimate** — a quick calculation accurate to an order of magnitude.
- **QPS** — queries (requests) per second.
- **Peak factor** — how much higher peak traffic runs than the average (often 2–3×).
- **Read:write ratio** — how many reads happen per write; drives caching and replicas.
- **Retention** — how long you keep data.
- **Replication factor** — how many copies of the data you store (e.g. 3).
- **Latency numbers** — the approximate time costs of memory, disk, and network operations.

# Options and Trade-offs

| Quantity | Formula | Assumption you must state |
| -------- | ------- | ------------------------- |
| Average QPS | users × actions ÷ 86,400 | daily active users, actions/user/day |
| Peak QPS | average QPS × peak factor | peak factor (2–3× is common) |
| Read QPS | write QPS × read:write ratio | the read:write ratio |
| Storage | items × size × retention × replication | item size, how long you keep it, copies |
| Bandwidth | QPS × payload size | typical payload size |
| Fits in memory? | working-set size vs RAM | how much of the data is "hot" |

# Worked Example

Size the **URL shortener** from Lesson 1. Given: **100 million new URLs per month**, and
redirects (reads) far outnumber creations (writes).

**1. Writes per second.** A month is about `30 x 86,400 = ~2.6 million` seconds.

```text
  write QPS = 100,000,000 / 2,600,000 = ~40 writes/second
```

**2. Reads per second.** Assume a 100:1 read:write ratio (a stated assumption!):

```text
  read QPS = 40 x 100 = ~4,000 reads/second (average)
  peak     = 4,000 x 2 = ~8,000 reads/second
```

**3. Storage over 5 years.** New URLs kept for 5 years:

```text
  total URLs = 100,000,000/month x 12 x 5 = ~6 billion URLs
  size each  = ~500 bytes (short code + long URL + metadata)
  raw        = 6,000,000,000 x 500 bytes = ~3 TB
  with 3x replication = ~9 TB
```

**Conclusion:** ~40 writes/sec and a few thousand reads/sec is *modest* — a single
database with a cache in front handles it comfortably; the read side is where we scale.
And ~9 TB easily fits on a small cluster. None of these numbers required code; they told
us the shape of the system. Notice every number rests on an assumption we wrote down —
that is what makes the estimate checkable.

# Real World Analogy

Estimating a system is like a caterer sizing an event. "About 500 guests, each eats
roughly 3 servings, over a 4-hour evening." They don't count every canapé; they multiply
rough numbers to decide how many kitchens and servers they need. If the math said "we'd
need 40 kitchens," they'd know the plan was wrong before cooking a thing.

# Examples

## Example 1 — Basic: does it fit in memory?

You want to cache 10 million user sessions, each about 1 KB. `10,000,000 x 1 KB = ~10 GB`.
That fits in RAM on a single modern cache server, so an in-memory cache is realistic.

**Why this works:** one multiplication answered an architecture question — no prototype
needed.

## Example 2 — Real-world: sizing a news feed's write fan-out

If a popular account with 10 million followers posts, and you write the post into each
follower's feed, that is `10,000,000` writes for one action. Estimating that *before*
building reveals the "fan-out" problem and pushes you toward a different design (compute
some feeds on read instead).

**Why this works:** the estimate exposes a scaling cliff early, when it is cheap to
change direction.

## Example 3 — Trade-off / pitfall: sizing for the average

You size a system for 1,000 QPS average and it collapses every evening. Traffic peaked at
3,000 QPS and you never applied a peak factor.

**Why this bites:** real traffic is spiky. Averages under-provision; always size for the
peak you expect.

# Common Mistakes

- **Not writing down assumptions.** An estimate without stated assumptions can't be
  checked or defended.
- **Sizing for the average.** Provision for peak traffic, not the daily mean.
- **Forgetting the replication factor.** Three copies is three times the storage.
- **False precision.** "4,000 QPS" is fine; "4,137 QPS" pretends to a certainty you don't
  have.
- **Mixing bits and bytes, or KB and Kb.** Keep units explicit.

# Best Practices

- **State every assumption out loud** (users, actions, sizes, ratios, retention).
- **Round to easy numbers** and use `86,400 ≈ 10^5 seconds/day`.
- **Always compute a peak**, not just the average.
- **Sanity-check against the latency numbers** — if a design needs a disk seek in a hot
  path expected to answer in microseconds, something is wrong.
- **Aim for the right order of magnitude**, then stop.

# Summary

- Back-of-the-envelope estimates get you within an order of magnitude fast, to size a
  design and kill bad ideas early.
- Know your **units** (each ~10 powers of two is KB→MB→GB→TB) and that **a day ≈ 10^5
  seconds**.
- The **latency numbers** are approximate orders of magnitude: memory ≪ SSD ≪ disk, and a
  cross-continent round trip (~150 ms) dwarfs local work — which is why we cache and use
  CDNs.
- Estimate **QPS**, **storage**, and **bandwidth** from stated assumptions, and always
  size for **peak**, not average.
- The discipline is **writing down assumptions**, not being exactly right.

# Flash Cards

Q: Roughly how many seconds are in a day, and why is it useful?
A: About 86,400 ≈ 10^5 seconds. It quickly converts "per day" figures into "per second" (QPS).

Q: What is the key takeaway from the latency numbers?
A: Memory is far faster than SSD, which is far faster than disk, and a cross-continent round trip (~150 ms) dwarfs local operations — so cache in memory and put content near users.

Q: Why should you size for peak load instead of average?
A: Traffic is spiky. Sizing for the average under-provisions and the system falls over at peak; apply a peak factor (often 2–3×).

Q: How do you estimate storage for a system?
A: items × size per item × retention × replication factor.

Q: What makes a back-of-the-envelope estimate trustworthy?
A: Stated assumptions. The number itself is rough; the assumptions are what let others check and challenge it.

# Exercises

### Easy
A day is ~10^5 seconds. If a service gets 500 million requests per day, what is the
average QPS? Then estimate a peak at 3×.

### Medium
Estimate storage for a photo service: 5 million photos uploaded per day, average 2 MB
each, kept for 3 years, stored with 3 copies. Show each step and your assumptions.

### Challenging
A messaging app has 50 million daily active users who each send 40 messages per day
(~200 bytes each). Estimate write QPS, peak write QPS, daily storage, and the bandwidth
to store messages. Then decide: does one database suffice, or do you need to partition?
Defend your answer with the numbers.

# Further Reading

- Jeff Dean & Peter Norvig, "Latency Numbers Every Programmer Should Know" (widely
  reproduced; Norvig's version appears in "Teach Yourself Programming in Ten Years").
- Martin Kleppmann, *Designing Data-Intensive Applications*, Chapter 1 (for how these
  numbers inform data-system design).
