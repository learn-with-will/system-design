---
id: lesson-09
slug: scaling-out-and-statelessness
title: "Scaling Out: Statelessness & the Scaling Cube"
level: intermediate
order: 9
duration: 24
tags:
  - scalability
  - stateless
  - horizontal-scaling
  - scale-cube
  - architecture
---

# Learning Objectives

By the end of this lesson you will be able to:

- Explain why **stateless** services are the key to horizontal scaling.
- Say where the state goes when a service is stateless.
- Describe the three axes of the **AKF Scale Cube**.
- Recognize when a service is accidentally stateful.
- Choose an axis of scaling for a given growth problem.

# Why It Matters

In Lesson 2 you met scaling *up* (a bigger box) versus scaling *out* (more boxes).
Scaling out is how large systems handle almost unlimited load — but it only works
smoothly if any server can handle any request. The property that makes that possible is
**statelessness**, and it's one of the most important design habits you can build.

# Concept Explanation

### Stateless vs stateful services

A **stateless** service keeps **no per-client memory between requests**. Everything it
needs to handle a request is either *in the request* or in a *shared store* both servers
can reach. Because no request depends on which server handled the last one, **any
instance can serve any request** — so you can add instances freely, replace a crashed one
instantly, and deploy new versions by rolling servers in and out.

A **stateful** service keeps important data **locally** — sessions in memory, files on
local disk, an in-process counter. Now requests are tied to a specific server: lose it and
you lose the state; add a server and it starts "cold." Stateful services are much harder
to scale and to make reliable.

### Where does the state go?

State doesn't vanish — you move it out of the individual server into somewhere shared:

- **A database** — durable data (users, orders).
- **A distributed cache** (e.g. Redis) — sessions, ephemeral fast-changing state.
- **Object storage** — files and blobs, instead of local disk.
- **The client** — a signed token (like a JWT) the client sends with each request, so the
  server needs no server-side session at all.

The result: servers become interchangeable "workers" and all the state lives in systems
built to be shared and replicated.

### The AKF Scale Cube

A useful map of *how* to scale, from *The Art of Scalability* (Abbott & Fisher), is the
**AKF Scale Cube** — three independent axes:

```text
        Z: data partitioning (shard by data)
        ^
        |
        |
        +---------> Y: functional split (by service)
       /
      /
     v
    X: horizontal duplication (clone the whole thing)
```

- **X-axis — horizontal duplication (cloning).** Run many identical copies of the whole
  service behind a load balancer; each copy handles a share of the traffic. This is the
  simplest axis — and it *requires statelessness*.
- **Y-axis — functional decomposition.** Split the system by **function** into separate
  services (e.g. "search," "checkout," "profiles"). Each can be scaled, deployed, and
  owned independently — the road to microservices (Phase 3).
- **Z-axis — data partitioning.** Split by **data**: each server or database handles a
  **subset** of the data (e.g. users A–M here, N–Z there; or by region). This is sharding,
  the next lesson.

Real systems combine axes — for example, several clones (X) of each of several services
(Y), each service's data partitioned (Z).

# Key Terminology

- **Stateless service** — keeps no per-client state between requests; any instance can
  serve any request.
- **Stateful service** — holds important state locally, tying requests to a specific
  server.
- **Externalizing state** — moving state out of the server into a shared database, cache,
  object store, or client token.
- **AKF Scale Cube** — a model with three scaling axes: X (clone), Y (split by function),
  Z (split by data).
- **Horizontal duplication (X)** — many identical copies behind a load balancer.
- **Functional decomposition (Y)** — separate services per function.
- **Data partitioning (Z)** — each node handles a subset of the data.

# Options and Trade-offs

| Axis | You scale by | Best for | Cost |
| ---- | ------------ | -------- | ---- |
| X — clone | Copying the whole app | Quick capacity for a stateless app | Every clone needs all the data/services |
| Y — split by function | Separating services | Independent teams, scaling, and deploys | Cross-service calls and coordination |
| Z — split by data | Partitioning the data | Data or writes too big for one node | Routing to the right shard; rebalancing |

# Worked Example

An app stores logged-in users' sessions **in each server's memory**. It runs fine on one
server, but you need to scale out and survive failures.

**The problem:** with in-memory sessions, a user is tied to the server that holds their
session. Scaling out needs sticky sessions; losing a server logs those users out. This is
an accidentally **stateful** service.

**The fix — externalize the session state:**

```text
  Before:  [Client] -> [Server holds session in memory]   (stateful; pinned)

  After:   [Client] -> [Load Balancer] -> any of [Server1..N]  (stateless)
                                                  |
                                          [Shared session store: Redis]
```

Now any server can serve any request by reading the session from the shared store (or
from a token the client carries). You've unlocked the **X-axis**: add servers freely,
replace crashed ones instantly, and deploy with zero-downtime rolling restarts. Nothing
about the feature changed — only *where the state lives*.

# Real World Analogy

A stateless service is like a chain of coffee shops where your loyalty info lives on a
card *you* carry (or in a central app), so **any** barista at **any** branch can serve
you. A stateful service is like a single café where only *your* regular barista remembers
your usual — great until they're off sick and no one else can help you. Externalizing
state is moving the "who likes what" from one barista's head into a shared system every
branch can read.

# Examples

## Example 1 — Basic: token-based auth

Instead of storing sessions on the server, the client holds a signed token and sends it
with each request. The server verifies the token's signature and serves the request — no
server-side session at all.

**Why this works:** the state travels with the client, so every server is fully
interchangeable.

## Example 2 — Real-world: combining axes at scale

A large system runs multiple **services** (Y) — catalog, cart, payments — each deployed as
many identical **clones** (X), with the catalog's data **partitioned** (Z) across shards.
Each axis solves a different bottleneck.

**Why this works:** the axes are independent, so you apply the one that matches each
constraint (traffic, team boundaries, data size).

## Example 3 — Trade-off / pitfall: hidden local state

A service writes uploaded files to its local disk "temporarily." When the load balancer
sends the follow-up request to a different server, the file isn't there.

**Why this bites:** local disk is per-server state. Uploading to shared object storage (or
passing a reference) keeps the service stateless and the servers interchangeable.

# Common Mistakes

- **Storing sessions or files locally.** Any per-server state breaks horizontal scaling
  and failover; externalize it.
- **Reaching for sticky sessions** to keep local state working, instead of removing the
  local state.
- **Assuming X-axis cloning is free.** Every clone still needs access to the data and
  downstream services, which may themselves become the bottleneck.
- **Jumping to Y-axis (microservices) too early.** Splitting by function adds coordination
  cost; a stateless, cloned monolith scales a long way first.

# Best Practices

- **Design services to be stateless**; push state to a database, cache, object store, or
  client token.
- **Scale the X-axis first** (clone a stateless app) — it's the simplest lever.
- **Reach for Y (split by function) when teams or components need to scale and deploy
  independently.**
- **Reach for Z (partition data) when the data or write volume outgrows one node**
  (next lesson).
- **Watch for accidental state**: local files, in-memory caches assumed to be shared,
  per-server counters.

# Summary

- **Stateless services keep no per-client state between requests**, so any instance can
  serve any request — the foundation of horizontal scaling and easy failover.
- Externalize state to a **database, distributed cache, object store, or client token**.
- The **AKF Scale Cube** has three axes: **X** (clone the whole app), **Y** (split by
  function), **Z** (partition the data).
- Scale **X first**; use **Y** for independent services and **Z** when data outgrows a
  node.
- Beware **accidental statefulness** (local sessions, local files) — it quietly blocks
  scaling.

# Flash Cards

Q: Why are stateless services the key to horizontal scaling?
A: Because they keep no per-client state between requests, so any instance can serve any request — you can add, replace, or roll servers freely.

Q: Where does the state go when a service is made stateless?
A: Into a shared store — a database, distributed cache, or object storage — or it travels with the client as a signed token.

Q: What are the three axes of the AKF Scale Cube?
A: X = horizontal duplication (clone the whole app), Y = functional decomposition (split by service), Z = data partitioning (shard by data).

Q: Which scaling axis does statelessness directly enable?
A: The X-axis — cloning the whole service behind a load balancer — because interchangeable stateless instances can each take a share of traffic.

Q: Give an example of accidental statefulness.
A: Storing sessions in a server's memory or writing uploaded files to local disk — the next request may land on a different server that doesn't have them.

Q: When should you reach for the Y-axis (split by function)?
A: When different components or teams need to scale, deploy, and be owned independently — the path toward microservices.

# Exercises

### Easy
List three things a web server might store locally that would make it stateful, and where
you'd move each to make it stateless.

### Medium
Explain how a signed token (like a JWT) lets a service be stateless for authentication.
What does the server check on each request, and what does it *no longer* need to store?

### Challenging
A monolith serves 10x its original traffic and one feature (search) is the hot spot.
Using the AKF cube, describe two different ways to scale (an X approach and a Y approach),
and argue which you'd try first and why.

# Further Reading

- Martin L. Abbott & Michael T. Fisher, *The Art of Scalability* — the AKF Scale Cube
  (X/Y/Z axes).
- Martin Kleppmann, *Designing Data-Intensive Applications*, Chapter 1 (scaling
  approaches) and Chapter 6 (partitioning, for the Z-axis).
