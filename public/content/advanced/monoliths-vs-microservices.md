---
id: lesson-17
slug: monoliths-vs-microservices
title: "Monoliths vs Microservices"
level: advanced
order: 17
duration: 26
tags:
  - microservices
  - monolith
  - architecture
  - service-boundaries
  - trade-offs
---

# Learning Objectives

By the end of this lesson you will be able to:

- Describe the **monolith** and **microservices** architectures and their real trade-offs.
- Explain how to find good **service boundaries**.
- Recognize the **distributed monolith** anti-pattern.
- Explain why "start with a monolith" is common advice.
- Decide which approach fits a given team and stage.

# Why It Matters

"Should we use microservices?" is one of the most consequential — and most cargo-culted —
architecture decisions. Microservices solve real problems at scale, but they impose the
full cost of distributed systems (everything in this course) on your everyday work. Knowing
*when* the trade is worth it, and when it isn't, separates good architecture from
resume-driven design.

# Concept Explanation

### The monolith

A **monolith** is a single deployable application: all the features live in one codebase
and run in one process (replicated behind a load balancer). Modules call each other with
ordinary function calls.

- **Strengths:** simple to build, test, and deploy; no network between components; easy
  cross-module **transactions**; one thing to run and reason about. It's the fastest way to
  ship early.
- **Weaknesses as it grows:** the codebase gets hard to understand; builds and deploys slow
  down; a bug or memory leak in one area can take down everything; you can't scale or
  choose technology **per feature**; and many teams contend over one deploy pipeline.

### Microservices

A **microservices** architecture splits the system into many small, **independently
deployable** services, each owning a **business capability** and **its own data**, talking
over the network (REST, gRPC, or messaging).

- **Strengths:** each service can be **deployed, scaled, and built with different tech
  independently**; teams own services autonomously; and a failure can be **isolated** to one
  service (if you design for it).
- **Weaknesses:** you inherit **all** of distributed systems — network calls, partial
  failure, retries, eventual consistency, distributed transactions — plus heavy operational
  overhead (many deployments, service discovery, distributed tracing) and harder end-to-end
  testing and debugging.

The core trade is **simplicity now vs independent scaling and team autonomy later**, paid
for with **distributed-systems complexity**.

### Finding service boundaries

If you do split, the boundaries make or break it. Split by **business capability / domain**
(e.g. "payments," "search," "notifications"), not by technical layer. A useful guide is a
**bounded context** from Domain-Driven Design: a boundary within which a model is
consistent. Crucially, **each service owns its own data** — no two services share a
database — so they can evolve independently. **Conway's Law** observes that your system's
structure will mirror your org's communication structure, so align services with teams.

### The distributed monolith (the worst of both worlds)

The classic failure mode: you split into services, but they're so **tightly coupled** they
must be **deployed together**, share a database, and call each other synchronously in long
chains. Now you have the **operational complexity of microservices** *and* the **coupling of
a monolith** — with none of the independence that justifies either.

```text
  Distributed monolith smell:
    change service A -> must also deploy B and C
    A, B, C share one database
    one request fans out A -> B -> C -> D synchronously (chain of failure)
```

Signs you have one: you can't deploy a service without deploying others; services share
tables; a change ripples across service boundaries.

### Start with a monolith?

Many experienced engineers (including Martin Fowler's "Monolith First") advise **starting
monolithic** and extracting services only when a concrete need appears — a component that
must scale independently, a team that needs to deploy on its own cadence, or a fault domain
you must isolate. Early on you don't know the right boundaries yet, and premature splitting
locks in the wrong ones. A **well-structured (modular) monolith** scales a surprisingly long
way.

# Key Terminology

- **Monolith** — one deployable application containing all features.
- **Microservices** — many small, independently deployable services, each owning its data.
- **Service boundary** — where one service's responsibility ends and another's begins.
- **Bounded context** — a DDD boundary within which a domain model is consistent.
- **Distributed monolith** — services so coupled they must deploy together; the worst of
  both worlds.
- **Conway's Law** — system structure mirrors the organization's communication structure.
- **Modular monolith** — a single deployable with clean internal module boundaries.

# Options and Trade-offs

| Aspect | Monolith | Microservices |
| ------ | -------- | ------------- |
| Early speed | Fast to build and ship | Slower; more moving parts |
| Deploy | One unit (all-or-nothing) | Independent per service |
| Scaling | Whole app together | Per service |
| Transactions | Easy (single database) | Hard (distributed) |
| Fault isolation | Weak (one crash affects all) | Strong (if designed well) |
| Operational cost | Low | High (discovery, tracing, many deploys) |
| Team autonomy | Contended pipeline | Independent teams |

# Worked Example

A startup's monolith has grown, and the **video-transcoding** feature is the problem: it's
CPU-hungry, needs to scale independently of the web tier, and its heavy load occasionally
starves the rest of the app.

Rather than "break everything into microservices," extract **just that one service**:

```text
  Before: [ Monolith: web + orders + transcoding ]  (transcoding starves the web tier)

  After:  [ Monolith: web + orders ] --(queue)--> [ Transcoding service ]
                                                    scales on CPU independently
```

- **Why extract transcoding:** it has a clear boundary, a different scaling profile, and a
  fault-isolation need — the exact justifications for a service.
- **Why keep the rest a monolith:** orders and web are tightly related, share transactions,
  and gain nothing from being split — splitting them would just add distributed complexity.

This is **incremental extraction**: split where there's a concrete reason, keep the rest
simple. Most successful microservice systems grew this way, not from a big-bang rewrite.

# Real World Analogy

A monolith is a food truck: one small space where the cook takes orders, cooks, and serves —
fast and simple, but one busy station jams everything and only one person can work at a
time. Microservices are a food court: separate specialized kitchens that scale and operate
independently, but now you need shared plumbing, signage, and coordination (the
infrastructure). A **distributed monolith** is a food court where every stall must open and
close at the exact same second and shares one cash register — all the overhead of a food
court with none of the independence.

# Examples

## Example 1 — Basic: a modular monolith

A team keeps a single deployable but enforces clean module boundaries (payments, catalog,
users) with well-defined internal interfaces. They get simplicity now and clear seams to
extract services later if needed.

**Why this works:** modularity captures much of the benefit of services without the
distributed cost — and makes future extraction easy.

## Example 2 — Real-world: independent scaling and teams

A large system runs search, checkout, and recommendations as separate services owned by
separate teams. Search scales on query load, checkout on order volume, each deploys on its
own schedule.

**Why this works:** the services have genuinely different scaling and ownership needs, which
is exactly what microservices are for.

## Example 3 — Trade-off / pitfall: the big-bang split

A small team with one product splits into 15 microservices on day one. They now spend their
time on service discovery, cross-service debugging, and distributed transactions instead of
features — for a product that a monolith would serve fine.

**Why this bites:** they took on distributed-systems cost with none of the scale or team
pressures that justify it. Premature microservices are a tax paid for benefits you don't yet
need.

# Common Mistakes

- **Adopting microservices for the résumé, not the need.** Match the architecture to real
  scaling and team pressures.
- **Splitting by technical layer** (a "database service," a "logic service") instead of by
  business capability.
- **Sharing a database across services.** That couples them into a distributed monolith;
  each service owns its data.
- **Synchronous call chains** (A→B→C→D) that turn one slow service into a system-wide
  failure; prefer async and resilience patterns.
- **Big-bang rewrites.** Extract incrementally where there's a concrete reason.

# Best Practices

- **Start with a well-structured (modular) monolith** unless you have a clear reason not to.
- **Extract services incrementally**, where independent scaling, deployment, or fault
  isolation genuinely pays.
- **Draw boundaries around business capabilities**, and give each service **its own data**.
- **Align services with teams** (Conway's Law), and keep them loosely coupled (async where
  possible).
- **Watch for the distributed-monolith smell**: coupled deploys, shared databases, long
  synchronous chains.

# Summary

- A **monolith** is one deployable — simple, fast to ship, easy transactions — but gets hard
  to scale, deploy, and evolve as it grows.
- **Microservices** are independently deployable services, each owning its data — enabling
  independent scaling, team autonomy, and fault isolation — at the cost of full
  **distributed-systems complexity**.
- Draw **boundaries by business capability**, give each service **its own data**, and align
  with teams (**Conway's Law**).
- The **distributed monolith** (coupled, co-deployed services sharing a database) is the
  worst of both worlds.
- **Start with a monolith** and extract services incrementally where there's a concrete
  need.

# Flash Cards

Q: What is the core trade-off between a monolith and microservices?
A: A monolith is simpler to build, deploy, and keep consistent; microservices give independent scaling, deployment, and team autonomy but impose full distributed-systems complexity.

Q: How should you draw service boundaries?
A: Around business capabilities / bounded contexts (e.g., payments, search), not technical layers — and each service should own its own data.

Q: What is a distributed monolith?
A: Services so tightly coupled that they must be deployed together, share a database, or call each other in long synchronous chains — the operational cost of microservices with the coupling of a monolith.

Q: Why do many experts recommend starting with a monolith?
A: Because early on you don't yet know the right service boundaries, splitting prematurely locks in wrong ones, and a well-structured monolith scales a long way — extract services when a concrete need appears.

Q: What does Conway's Law say, and why does it matter here?
A: A system's structure mirrors the communicating structure of the organization that builds it — so align service boundaries with team boundaries.

Q: Give a sign that services should share NO database.
A: If two services share tables, a schema change in one breaks the other and they must deploy together — coupling them into a distributed monolith. Each service owning its data keeps them independent.

# Exercises

### Easy
List three concrete signals that a specific feature is worth extracting from a monolith into
its own service.

### Medium
A team split their app into services but must deploy all of them together and they share one
database. Diagnose the anti-pattern, explain the costs they're paying, and outline how to
move toward genuine independence.

### Challenging
You run a growing monolith. One module (notifications) needs to scale independently and is
owned by a new team; another (billing) is tightly coupled to orders. Decide what to extract
and what to keep, justify each with the trade-offs, and describe how the extracted service
communicates and owns its data.

# Further Reading

- Martin Fowler — "Microservices," "MonolithFirst," and "MicroservicePremium":
  https://martinfowler.com/microservices/
- Sam Newman, *Building Microservices* (O'Reilly) — service boundaries, ownership, and
  decomposition.
