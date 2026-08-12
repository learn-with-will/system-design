---
id: lesson-01
slug: what-is-system-design
title: "What Is System Design?"
level: beginner
order: 1
duration: 18
tags:
  - fundamentals
  - requirements
  - trade-offs
  - reliability
  - scalability
---

# Learning Objectives

By the end of this lesson you will be able to:

- Explain what system design is and what a "system" means here.
- Tell **functional** requirements apart from **non-functional** ones.
- Name the three properties good systems aim for: **reliability**, **scalability**, and **maintainability**.
- Describe a simple, repeatable process for approaching any design problem.
- Explain why system design is about **trade-offs**, not single right answers.

# Why It Matters

Writing code that works on your laptop is one skill. Making it keep working when a
million people use it at once — without losing data, going down, or costing a fortune —
is a different skill. That second skill is **system design**.

Almost every senior-engineer interview includes a system design round, and almost every
real production incident traces back to a design decision made (or skipped) long before
the code was written. Learning to reason about these decisions early saves you from
learning them the hard way at 3 a.m.

# Concept Explanation

**System design** is the process of deciding how the parts of a software system — its
servers, databases, caches, queues, and the network between them — fit together to meet
a set of goals. A **system** is just the whole collection of those parts working
together to serve users.

### Two kinds of requirements

Every design starts with requirements, and they come in two flavors:

- **Functional requirements** say *what the system does* — the features. "A user can
  shorten a long URL and get a short link." "A user can post a photo." If you can phrase
  it as "the system shall let someone ___," it is functional.
- **Non-functional requirements (NFRs)** say *how well the system must do it* — the
  qualities. "The short link must redirect in under 100 milliseconds." "We must not lose
  a posted photo." "The service should stay up 99.9% of the time." NFRs are where system
  design gets hard, because they pull against each other.

Beginners tend to focus on features. Experienced designers spend most of their time on
the non-functional requirements, because those decide the architecture.

### Three properties good systems share

In *Designing Data-Intensive Applications*, Martin Kleppmann frames system design around
three properties. They are a useful checklist for any design:

- **Reliability** — the system keeps working *correctly* even when things go wrong
  (a server crashes, a disk fails, a user sends bad input). A reliable system is
  **fault-tolerant**: a fault in one part does not become a failure of the whole.
- **Scalability** — the system can cope with *growth*: more users, more data, more
  traffic. Scalability is not a yes/no property; you describe it by asking "if load
  doubles, what do we have to do to keep performance acceptable?"
- **Maintainability** — people can *operate, understand, and change* the system over
  time. Most of a system's cost is paid after it is first built, so this matters more
  than beginners expect.

### It is all trade-offs

There is rarely one correct architecture. Making reads faster with a cache can make the
data slightly stale. Storing three copies of your data survives a disk failure but
triples storage cost. **Every choice buys something and costs something.** The job is
not to find the "right" answer — it is to choose deliberately and be able to explain
*why*, given the requirements.

# Key Terminology

- **System** — the whole set of components (services, databases, network) working
  together to serve users.
- **Functional requirement** — what the system does (a feature).
- **Non-functional requirement (NFR)** — a quality the system must have (speed,
  availability, durability, cost).
- **Reliability** — continuing to work correctly when faults occur.
- **Fault vs failure** — a *fault* is one component misbehaving; a *failure* is the
  whole system not delivering its service. Good design stops faults from becoming
  failures.
- **Scalability** — the ability to handle growing load without falling over.
- **Maintainability** — how easily people can operate and evolve the system.
- **Latency** — how long one request takes.
- **Throughput** — how many requests the system handles per unit of time.
- **Trade-off** — gaining one quality at the cost of another.
- **Bottleneck** — the one component that limits the whole system's performance.

# Options and Trade-offs

The common non-functional requirements, and how you actually measure each one:

| Non-functional requirement | What it asks | How you measure it |
| -------------------------- | ------------ | ------------------ |
| Scalability | Can we handle more load? | Requests/sec (throughput) at acceptable latency |
| Availability | Is it up when users need it? | Uptime percentage ("nines") |
| Latency / performance | Is it fast enough? | Response time, usually at a percentile like p99 |
| Durability | Will we ever lose stored data? | Probability of data loss; number of copies |
| Consistency | Do all users see the same data? | The consistency model you guarantee |
| Cost | Can we afford to run it? | Money per month; money per request |
| Security | Is data protected and access controlled? | Authentication, authorization, encryption |
| Maintainability | Can the team keep changing it safely? | Deploy frequency, time to diagnose issues |

You will almost never maximize all of these at once. Requirements tell you which ones
matter most for *this* system.

# Worked Example

Suppose the request is: **"Design a service that shortens long URLs."** Before drawing
anything, turn it into requirements.

**Functional requirements**

- Given a long URL, return a short one.
- Visiting the short URL redirects to the original.

**Non-functional requirements (ask the interviewer or stakeholder)**

- Scale: ~100 million new links per month; reads (redirects) vastly outnumber writes.
- Latency: a redirect should feel instant (tens of milliseconds).
- Availability: redirects must almost always work — a dead link is very visible.
- Durability: we must not lose the mapping from short to long URL.

Only now do you sketch a first, deliberately simple architecture:

```text
                +-------------------+
  Browser --->  |   Load Balancer   |   spreads traffic across app servers
                +---------+---------+
                          |
                 +--------+--------+
                 |   App servers   |   stateless: create + look up links
                 +----+-------+----+
                      |       |
              (read)  |       |  (miss)
                 +----v--+  +-v-----------+
                 | Cache |  |  Database   |  stores short -> long mapping
                 +-------+  +-------------+
```

The reasoning: because redirects (reads) hugely outnumber link creation (writes), we put
a **cache** in front of the database so hot links are served from memory. Because a dead
redirect is very visible, we prioritize **availability** and **durability** of the
mapping. You have not written any code, yet you have already made the decisions that
shape everything else. We will fill in each box in later lessons — and design this exact
system top to bottom in the capstone.

# Real World Analogy

System design is like designing a building. The **functional requirements** are "it has
offices, a lobby, and parking." The **non-functional requirements** are "it stays
standing in an earthquake, fits 2,000 people, and we can afford to build it." An
architect cannot maximize everything — more earthquake resistance costs more money;
more parking means less office space. They make deliberate trade-offs against the
constraints. Software architects do exactly the same with servers instead of steel.

# Examples

## Example 1 — Basic: a personal to-do app

A single-user to-do list has light requirements: a handful of users, no strict uptime
promise, tiny data. One small server and one database is a completely appropriate
design. Adding caches, queues, and replicas here would be waste.

**Why this works:** the requirements are modest, so the simplest design that meets them
is the best one.

## Example 2 — Real-world: a ride-hailing "find nearby drivers" feature

Now the non-functional requirements dominate. Millions of location updates per minute,
answers needed in well under a second, and it must keep working during a citywide surge.
Those NFRs force real decisions: geographic partitioning of data, in-memory indexes,
and graceful behavior under overload — none of which the *feature* description mentions.

**Why this works:** the hard part is not the feature; it is meeting the qualities around
it, which is exactly what system design addresses.

## Example 3 — Trade-off / pitfall: designing for scale you don't have

A team building a brand-new product adds sharded databases, a message queue, and a dozen
microservices "so it will scale." Six months later they have five users and a system so
complex they can barely ship a change.

**Why this bites:** scalability is a real property, but it trades against
**maintainability** and **cost**. Designing for a million users you don't have yet buys
a problem you don't have and pays for it with one you do. Match the design to the
requirements you actually have.

# Common Mistakes

- **Jumping to a diagram before writing requirements.** The requirements decide the
  design; guessing the design first means solving the wrong problem.
- **Only listing features.** If you never wrote down latency, availability, or scale
  targets, you have not really started designing.
- **Treating "scalable" as always good.** Scale trades against simplicity and cost.
  More is not better; *appropriate* is better.
- **Presenting one design as "the right answer."** Interviewers and teammates want to
  hear the trade-offs and why you chose what you chose.

# Best Practices

- **Start with requirements**, and separate functional from non-functional explicitly.
- **Quantify the non-functional requirements**: put numbers on scale, latency, and
  availability so you can check your design against them.
- **Design the simplest thing that meets the requirements**, then evolve it as load
  grows.
- **Say the trade-offs out loud.** For each major choice, name what it buys and what it
  costs.
- **Find the bottleneck.** The component that limits the system is where your attention
  belongs.

# Summary

- **System design** decides how a system's parts fit together to meet its goals.
- **Functional requirements** are features; **non-functional requirements** are
  qualities (scale, latency, availability, durability, cost) — and the NFRs drive the
  architecture.
- Good systems aim for **reliability**, **scalability**, and **maintainability**.
- A **fault** is one part misbehaving; a **failure** is the whole system not working.
  Reliable design keeps faults from becoming failures.
- There is no single right design — every choice is a **trade-off**, and the skill is
  choosing deliberately and explaining why.

# Flash Cards

Q: What is the difference between a functional and a non-functional requirement?
A: A functional requirement is what the system does (a feature); a non-functional requirement is a quality it must have, like latency, availability, durability, or cost.

Q: What are the three properties good systems aim for, per DDIA?
A: Reliability, scalability, and maintainability.

Q: What is the difference between a fault and a failure?
A: A fault is one component misbehaving; a failure is the whole system not delivering its service. Good design stops faults from becoming failures.

Q: Is "make it scalable" always the right goal?
A: No — scalability trades against simplicity, maintainability, and cost. Match the design to the load you actually need to handle.

Q: What does it mean that system design is "all trade-offs"?
A: Every choice buys one quality at the cost of another, so the goal is not a single right answer but a deliberate, explainable choice given the requirements.

Q: Why do experienced designers focus on non-functional requirements?
A: Because the qualities — scale, latency, availability — are what actually decide the architecture, while the features alone rarely do.

# Exercises

### Easy
Take an app you use daily (say, a messaging app). Write two functional requirements and
three non-functional requirements for it. For each NFR, note how you would measure it.

### Medium
For the URL shortener in the worked example, argue for one place a cache helps and one
place it could *hurt* (think about a link that gets edited or deleted). What trade-off
are you making?

### Challenging
A startup asks you to "build it to scale to 100 million users from day one." They
currently have zero users. Write a short response: what would you actually build first,
and how would you decide *when* to add scaling machinery? Name the trade-off you are
managing.

# Further Reading

- Martin Kleppmann, *Designing Data-Intensive Applications*, Chapter 1 — "Reliable,
  Scalable, and Maintainable Applications."
- Google, *Site Reliability Engineering* — https://sre.google/books/ (Introduction and
  the chapters on service level objectives).
