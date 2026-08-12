---
id: lesson-08
slug: load-balancing-and-reverse-proxies
title: "Load Balancing & Reverse Proxies"
level: beginner
order: 8
duration: 24
tags:
  - load-balancing
  - reverse-proxy
  - high-availability
  - health-checks
  - routing
---

# Learning Objectives

By the end of this lesson you will be able to:

- Explain what a **load balancer** does and why it enables both scale and availability.
- Tell **Layer 4** load balancing apart from **Layer 7**.
- Compare balancing algorithms (round-robin, least-connections, hashing).
- Explain **health checks** and how they route around failures.
- Describe a **reverse proxy** and what else it does (TLS termination, caching).

# Why It Matters

Once you have more than one server (and any serious system does), something has to decide
which server handles each request. That something is a **load balancer**. It's what lets
you scale out horizontally *and* survive a server dying — two of the most important
properties in system design — so it appears in almost every architecture you'll draw.

# Concept Explanation

### What a load balancer does

A **load balancer (LB)** sits in front of a pool of servers and distributes incoming
requests across them. It gives you three things at once:

- **Scalability** — spread load across many servers, so you can add more to handle growth.
- **Availability** — if a server fails, the LB stops sending it traffic and routes to the
  healthy ones.
- **Better latency** — send requests to servers that are less busy or closer.

```text
                       +------------------+
   Clients  ------->   |  Load Balancer   |
                       +---+----+----+----+
                           |    |    |
                        +--v-+ +v--+ +v--+
                        |App1| |App2| |App3|   pool of servers
                        +----+ +----+ +----+
```

### Layer 4 vs Layer 7

Load balancers operate at one of two levels of the network stack:

- **Layer 4 (transport)** — routes based on **IP address and TCP/UDP port**, without
  looking at the request contents. It's fast and simple: it just forwards connections.
- **Layer 7 (application)** — understands the **application protocol** (usually HTTP), so
  it can route on the **path, host, headers, or cookies**. That enables content-based
  routing ("send `/api` to the API servers, `/images` to the image servers"), plus TLS
  termination and request rewriting. It does more work per request.

| | Layer 4 | Layer 7 |
| --- | ------- | ------- |
| Routes on | IP + port | HTTP path, host, headers, cookies |
| Sees content? | No | Yes |
| Speed | Faster, less overhead | More processing per request |
| Enables | Simple, fast forwarding | Content routing, TLS termination, rewriting |

### Balancing algorithms

How does the LB pick a server?

| Algorithm | How it chooses | Good when |
| --------- | -------------- | --------- |
| Round-robin | Each server in turn | Servers are equal and requests are similar |
| Weighted round-robin | In turn, but bigger servers get more | Servers have different capacity |
| Least connections | The server with the fewest active connections | Request durations vary a lot |
| Least response time | The fastest-responding server | Latency-sensitive workloads |
| Hash (e.g. by client IP) | A hash maps a client to a fixed server | You need the same client to hit the same server |

### Health checks

The LB continuously **health-checks** its backends — for example, requesting `/healthz`
every few seconds. A server that fails its checks is taken out of rotation until it
passes again. This is how the LB routes *around* failures automatically, turning a server
crash (a fault) into a non-event for users rather than an outage (a failure).

### Reverse proxies

A **reverse proxy** sits in front of your servers and forwards client requests to them
(as opposed to a **forward proxy**, which sits in front of clients and forwards their
requests out to the internet). Load balancing is one thing a reverse proxy does; it also
commonly handles:

- **TLS termination** — decrypt HTTPS at the proxy so backends can speak plain HTTP.
- **Caching and compression** — serve cached responses; compress replies.
- **Security** — hide backend addresses, filter bad requests, enforce limits.

Popular reverse proxies include NGINX, HAProxy, and Envoy. In practice "load balancer"
and "reverse proxy" often refer to the same box doing several of these jobs.

### Don't make the balancer a single point of failure

If all traffic flows through one load balancer, the LB itself is a **single point of
failure**. Production setups run **redundant** load balancers (for example, an
active-passive pair that fails over, or several behind DNS) so the thing that provides
availability doesn't take the system down when *it* fails.

# Key Terminology

- **Load balancer** — distributes requests across a pool of servers.
- **Layer 4 (L4)** — balancing on IP/port, without reading the request content.
- **Layer 7 (L7)** — balancing on application data (HTTP path, host, headers).
- **Round-robin / least-connections / hash** — algorithms for choosing a backend.
- **Health check** — a periodic probe that removes unhealthy servers from rotation.
- **Reverse proxy** — a server-side intermediary that forwards requests to backends and
  can terminate TLS, cache, and secure traffic.
- **Session affinity (sticky sessions)** — routing a given client to the same backend.
- **Single point of failure (SPOF)** — a component whose failure takes down the whole
  system.

# Options and Trade-offs

| Choice | Option | Trade-off |
| ------ | ------ | --------- |
| Layer | L4 (fast, content-blind) vs L7 (smart, content-aware) | Speed vs routing flexibility |
| Algorithm | Round-robin (simple) vs least-connections (adaptive) | Simplicity vs handling uneven load |
| Stickiness | Sticky sessions vs stateless | Easy session state vs true horizontal scale |
| LB redundancy | Single LB vs redundant pair | Simplicity vs removing the SPOF |

# Worked Example

Traffic to a single app server is maxing it out and, worse, if it crashes the whole site
is down. Put a **Layer 7 load balancer** in front of three app servers.

```text
  Clients --> L7 Load Balancer --> App1 / App2 / App3
                     |  health check /healthz every 5s
                     |  algorithm: least-connections
```

- **Scale:** the three servers now share the load; add App4 when traffic grows.
- **Availability:** the LB health-checks each server. If App2 crashes, it fails the check
  and the LB stops routing to it — users never notice; the other two absorb the traffic.
- **Content routing (L7):** requests to `/api/*` can go to API servers and `/static/*` to
  asset servers, all through the same entry point.

One subtlety: if a user's session lives *in memory* on App1, then losing App1 (or routing
them to App3) loses their session. The clean fix isn't sticky sessions — it's to make the
servers **stateless** by keeping session state in a shared store (a database or cache), so
any server can serve any request. We build on statelessness in the next phase.

# Real World Analogy

A load balancer is the host at a busy restaurant with many identical dining rooms. As
guests arrive, the host seats them to balance the rooms — **round-robin** is "next room in
turn," **least-connections** is "the emptiest room." If a room's air conditioning breaks
(a failed **health check**), the host simply stops seating there. And if there were only
*one* host and they went on break, the whole entrance would jam — so busy restaurants keep
a **backup host** (a redundant load balancer).

# Examples

## Example 1 — Basic: round-robin across equal servers

Three identical stateless web servers handle similar requests. Round-robin spreads
requests evenly with almost no overhead — the simplest thing that works.

**Why this works:** when servers and requests are uniform, simple rotation balances load
well.

## Example 2 — Real-world: least-connections for uneven work

An API mixes quick lookups with slow report generation. Round-robin would pile slow
requests unevenly; **least-connections** sends new requests to whichever server is least
busy, smoothing the load.

**Why this works:** when request cost varies, an adaptive algorithm beats blind rotation.

## Example 3 — Trade-off / pitfall: sticky sessions hiding statefulness

To keep users' in-memory sessions working, a team enables sticky sessions. Later, one
server dies and thousands of users are logged out; and load can't rebalance because users
are pinned.

**Why this bites:** stickiness papered over server-side state. Externalizing session state
(stateless servers) would have let any server handle any user and survive a failure.

# Common Mistakes

- **A single load balancer as a SPOF.** Make the LB itself redundant.
- **Skipping or misconfiguring health checks.** Without good checks, the LB keeps sending
  traffic to dead or sick servers.
- **Relying on sticky sessions instead of stateless servers.** Stickiness limits
  rebalancing and loses state on failure.
- **Using L4 when you need content routing** (or L7 when you just need fast forwarding) —
  match the layer to the need.

# Best Practices

- **Put a load balancer in front of any multi-server tier**, and make it **redundant**.
- **Use health checks** with a lightweight endpoint so failures are removed quickly.
- **Choose the algorithm to the workload**: round-robin for uniform, least-connections for
  variable request costs.
- **Prefer stateless servers** with shared session storage over sticky sessions.
- **Use L7 for content-based routing and TLS termination; L4 when raw speed is the
  priority.**

# Summary

- A **load balancer** distributes requests across a server pool, giving you
  **scalability**, **availability**, and better latency at once.
- **Layer 4** routes on IP/port (fast, content-blind); **Layer 7** routes on HTTP data
  (content-aware, enables TLS termination and content routing).
- Algorithms like **round-robin**, **least-connections**, and **hashing** decide which
  server handles each request.
- **Health checks** remove unhealthy servers automatically, turning crashes into
  non-events.
- A **reverse proxy** fronts your servers (LB, TLS termination, caching, security) — and
  the LB itself must be **redundant** so it isn't a single point of failure.

# Flash Cards

Q: What three benefits does a load balancer provide at once?
A: Scalability (spread load), availability (route around failed servers), and better latency (send to less-busy or closer servers).

Q: What is the difference between Layer 4 and Layer 7 load balancing?
A: Layer 4 routes on IP and port without reading content; Layer 7 understands the application protocol (HTTP) and can route on path, host, headers, or cookies.

Q: When is least-connections better than round-robin?
A: When request durations vary a lot — least-connections sends new requests to the least-busy server, while round-robin can pile slow requests unevenly.

Q: What does a health check accomplish?
A: It periodically probes each backend and removes unhealthy ones from rotation, so the load balancer automatically routes around failures.

Q: What is a reverse proxy, and how does it differ from a forward proxy?
A: A reverse proxy sits in front of servers and forwards client requests to them (and can terminate TLS, cache, and secure traffic); a forward proxy sits in front of clients and forwards their requests out to the internet.

Q: Why should the load balancer itself be redundant?
A: Because if all traffic flows through one LB, that LB is a single point of failure — so production runs redundant LBs (e.g., an active-passive pair) so it can't take the system down.

# Exercises

### Easy
Draw a simple architecture with a load balancer in front of three app servers. Mark where
health checks happen and what occurs when one server fails.

### Medium
An API has fast reads and slow report jobs on the same servers. Which balancing algorithm
would you choose and why? What signal would tell you your choice is working?

### Challenging
Your session data lives in each server's memory, so you enabled sticky sessions. A server
failure just logged out thousands of users. Redesign for statelessness: where does session
state go, what changes for the load balancer, and what do you gain in scaling and
failure handling?

# Further Reading

- NGINX documentation — "HTTP Load Balancing" and reverse-proxy guides:
  https://nginx.org/en/docs/
- HAProxy documentation — https://www.haproxy.org/ (Layer 4/Layer 7 load balancing,
  health checks).
- Google, *Site Reliability Engineering* — https://sre.google/books/ ("Load Balancing"
  chapters).
