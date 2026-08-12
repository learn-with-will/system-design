---
id: lesson-04
slug: how-the-internet-works
title: "How the Internet Works for Designers"
level: beginner
order: 4
duration: 24
tags:
  - networking
  - tcp
  - dns
  - http
  - tls
---

# Learning Objectives

By the end of this lesson you will be able to:

- Describe how data crosses the internet in **packets** over **IP**.
- Explain the difference between **TCP** and **UDP** and when each is used.
- Say what **DNS** does and why its caching matters.
- Explain **HTTP**, **HTTPS**, and what **TLS** adds.
- Trace the round trips a browser makes to load a page, and why they cost latency.

# Why It Matters

Every system you design talks over the network, and the network is where a surprising
amount of your latency and failure lives. You do not need to be a network engineer, but
you *do* need a designer's mental model: what a request actually does between "click" and
"response," and where the time and the risk go. That model explains why we cache, why we
use CDNs, and why "just add a service call" is never free.

# Concept Explanation

### Packets and IP

Data doesn't travel as one stream; it is broken into **packets** that are routed
independently across many networks and reassembled at the destination. The **Internet
Protocol (IP)** handles **addressing** (every device has an IP address) and **routing**
(getting packets toward that address). IP is **best-effort**: it does not promise a
packet will arrive, arrive once, or arrive in order. Something on top has to add those
guarantees — that's TCP.

### TCP vs UDP

Two "transport" protocols sit on top of IP:

- **TCP (Transmission Control Protocol)** is **connection-oriented and reliable**. It
  sets up a connection with a **three-way handshake** (`SYN → SYN-ACK → ACK`), then
  delivers bytes **in order**, retransmits anything lost, and slows down when the network
  is congested. HTTP uses TCP (through HTTP/2). The reliability costs a round trip up
  front and some overhead.
- **UDP (User Datagram Protocol)** is **connectionless and unreliable**: fire a packet
  and hope. No handshake, no ordering, no retransmission — but almost no overhead. It's
  used where speed beats perfection or the app handles reliability itself: DNS lookups,
  live video and voice, games, and QUIC (which powers HTTP/3).

Rule of thumb: **TCP when every byte must arrive correctly; UDP when timeliness matters
more than guaranteed delivery.**

### DNS: names to addresses

People type `example.com`; machines need an IP address. The **Domain Name System (DNS)**
is the internet's phone book. A lookup walks a hierarchy — **root** servers point to the
**top-level domain** (`.com`) servers, which point to the domain's **authoritative**
server — and the answer is **cached** at each layer for a period set by its **TTL**
(time-to-live). Because of caching, most lookups are answered locally in microseconds
rather than doing the full walk. DNS usually runs over UDP.

### HTTP and HTTPS

**HTTP (HyperText Transfer Protocol)** is the request/response language of the web: the
client sends a **method** and a path, the server returns a **status code** and a body.
HTTP is **stateless** — each request stands alone and the server keeps no memory of prior
requests unless the app adds it (cookies, tokens). We cover HTTP methods and status codes
in the next lesson.

**HTTPS** is just HTTP running inside **TLS (Transport Layer Security)**. TLS adds three
things:

- **Confidentiality** — the traffic is encrypted, so eavesdroppers see gibberish.
- **Integrity** — tampering in transit is detected.
- **Authentication** — a **certificate** signed by a trusted **Certificate Authority**
  proves you are really talking to `example.com`, not an impostor.

TLS 1.3 (RFC 8446) trimmed its handshake to a **single round trip** (with an optional
0-RTT resumption for repeat visits), which matters because handshakes cost latency.

### What a page load actually costs

Put it together and a first request to a site does something like this:

```text
  Browser                                   Servers
     |  1. DNS: what is the IP of x.com? --> (often cached; else a lookup)
     |  2. TCP handshake (SYN/SYN-ACK/ACK) --> 1 round trip
     |  3. TLS handshake (encrypt + verify)--> ~1 round trip (TLS 1.3)
     |  4. HTTP request  GET /            -->
     |                                    <-- 5. HTTP response (HTML)
     v
```

Each **round trip (RTT)** is real time. Within one data center an RTT is ~0.5 ms; across
continents it's ~150 ms. That is why we cut round trips (keep connections alive, resume
TLS) and move content closer to users.

### CDNs: bringing content closer

A **Content Delivery Network (CDN)** is a fleet of servers spread around the world that
**cache** copies of your static content (images, video, scripts, and sometimes API
responses) at **edge** locations near users. A user in Tokyo is served from a nearby edge
instead of your origin server in Virginia — turning a ~150 ms trip into a few
milliseconds, and taking load off your origin.

# Key Terminology

- **Packet** — a small chunk of data routed independently across the network.
- **IP** — the protocol for addressing and routing; best-effort, no guarantees.
- **TCP** — reliable, ordered, connection-oriented transport (uses a 3-way handshake).
- **UDP** — connectionless, unreliable, low-overhead transport.
- **Round trip (RTT)** — one message to the server and back; a unit of network latency.
- **DNS** — resolves domain names to IP addresses; hierarchical and cached by TTL.
- **HTTP** — the stateless request/response protocol of the web.
- **TLS / HTTPS** — encryption, integrity, and authentication layered under HTTP.
- **Certificate / Certificate Authority (CA)** — proof, signed by a trusted party, of a
  server's identity.
- **CDN** — geographically distributed caches that serve content near users.

# Options and Trade-offs

| Choice | Use it when | Trade-off |
| ------ | ----------- | --------- |
| TCP | Every byte must arrive correctly and in order (web, APIs) | Handshake + ordering overhead |
| UDP | Timeliness beats guaranteed delivery (media, DNS, gaming) | Your app must handle loss/ordering |
| Long-lived / reused connections | You make many requests to the same host | Must manage connection pools |
| CDN for static content | Users are geographically spread | Cache invalidation; extra cost |
| HTTPS everywhere | Always, for real traffic | A little handshake latency (small with TLS 1.3) |

# Worked Example

A user in Australia loads a page whose server is in the US. Naively, the browser needs a
DNS lookup, a TCP handshake, a TLS handshake, and then the HTTP request — several round
trips, each ~150 ms across the Pacific. That's most of a second before any content
appears.

Two design moves cut this dramatically:

- **Serve static assets from a CDN edge in Australia.** The images, CSS, and JavaScript
  now come from ~10 ms away instead of ~150 ms.
- **Reuse the connection.** After the first request, keep the TCP/TLS connection open so
  later requests skip the handshakes entirely.

```text
  Before:  DNS + TCP + TLS + HTTP, each ~150 ms   -> ~0.6 s to first content
  After:   assets from local CDN edge (~10 ms), connection reused -> ~tens of ms
```

We changed no application logic — only *where* the bytes come from and *how often* we
pay for handshakes.

# Real World Analogy

Sending a request over the internet is like international shipping. **IP** is the postal
system: it addresses and routes parcels but doesn't guarantee delivery. **TCP** is
registered mail with tracking and re-sending of lost parcels; **UDP** is dropping a
postcard in the box and hoping. **DNS** is looking up a street address from a company
name. **TLS** is a tamper-proof, sealed diplomatic pouch that also proves who sent it.
And a **CDN** is a local warehouse so customers get goods from across town, not across an
ocean.

# Examples

## Example 1 — Basic: why DNS caching matters

The first visit to a site may do a full DNS resolution; the next visits reuse the cached
answer until its TTL expires. That's why the *second* page load often starts faster.

**Why this works:** caching turns a multi-step lookup into a local, near-instant answer
for the life of the TTL.

## Example 2 — Real-world: choosing UDP for live video

A video call uses UDP-based transport. If a packet carrying 20 ms of audio is lost,
re-sending it is pointless — by the time it arrived, that moment has passed. Better to
skip it and keep the call in real time.

**Why this works:** for live media, on-time beats complete, which is exactly UDP's
trade-off.

## Example 3 — Trade-off / pitfall: many tiny cross-region calls

A service in one region makes 10 sequential calls to a database in another region, each a
~100 ms round trip. That's ~1 second of pure network time, no matter how fast the
database is.

**Why this bites:** latency is dominated by round trips, not by the work per call.
Co-locate chatty components, or batch the 10 calls into one.

# Common Mistakes

- **Ignoring round trips.** Latency is often dominated by the number of network round
  trips, not by server work. Count them.
- **Chatty cross-region calls.** Many small calls across a high-latency link add up
  fast; batch or co-locate.
- **Forgetting TLS/DNS costs on the first request.** The first connection pays for
  handshakes; connection reuse and 0-RTT resumption help.
- **Assuming TCP guarantees speed.** TCP guarantees *delivery and order*, not low
  latency; a lossy or distant link is still slow.

# Best Practices

- **Minimize round trips**: reuse connections, resume TLS, and batch requests.
- **Use a CDN** for static assets and geographically spread users.
- **Use HTTPS everywhere** — the handshake cost is small, especially with TLS 1.3.
- **Co-locate chatty components** so hot paths don't cross oceans.
- **Set sensible DNS TTLs**: long enough to benefit from caching, short enough to allow
  failover.

# Summary

- Data crosses the internet as **packets** over **IP**, which is best-effort (no
  guarantees).
- **TCP** is reliable and ordered (with a handshake); **UDP** is fast and
  connectionless. Use TCP when every byte matters, UDP when timeliness matters more.
- **DNS** maps names to IP addresses and is heavily **cached** by TTL.
- **HTTPS** is HTTP inside **TLS**, which adds encryption, integrity, and server
  authentication via certificates.
- Latency is dominated by **round trips**; a cross-continent RTT (~150 ms) is huge, so we
  reuse connections and put content near users with **CDNs**.

# Flash Cards

Q: What guarantees does IP provide?
A: Addressing and routing on a best-effort basis — no guarantee that a packet arrives, arrives once, or arrives in order.

Q: When would you choose UDP over TCP?
A: When timeliness matters more than guaranteed delivery — live video/voice, gaming, DNS — or when the application handles reliability itself.

Q: What does DNS do, and why is caching important?
A: DNS resolves domain names to IP addresses through a hierarchy; caching (by TTL) means most lookups are answered locally in microseconds instead of doing the full walk.

Q: What three things does TLS add to HTTP?
A: Confidentiality (encryption), integrity (tamper detection), and authentication (a CA-signed certificate proving the server's identity).

Q: Why does a cross-continent request feel slow even with fast servers?
A: Latency is dominated by round trips, and a cross-continent RTT is ~150 ms. Several handshakes plus the request can add up to most of a second.

Q: How does a CDN reduce latency?
A: It caches content on edge servers near users, so requests travel a few milliseconds to a nearby edge instead of ~150 ms to a distant origin.

# Exercises

### Easy
List, in order, the round trips a browser makes on its *first* HTTPS request to a new
site. Which of them can be skipped on later requests to the same site?

### Medium
A mobile app makes 6 sequential API calls to render one screen, each a ~120 ms round
trip to a distant server. What is the total network time? Propose two design changes to
reduce it and estimate the improvement.

### Challenging
You run a global photo site with an origin in one region. Users worldwide complain that
images load slowly. Design a plan using DNS, connection reuse, and a CDN. Explain what
each piece fixes, and one thing a CDN makes *harder* (hint: updating a changed image).

# Further Reading

- MDN Web Docs — "How the web works," "An overview of HTTP," and the DNS and TLS guides:
  https://developer.mozilla.org/en-US/docs/Web
- IETF RFC 9110 — "HTTP Semantics." IETF RFC 8446 — "The Transport Layer Security (TLS)
  Protocol Version 1.3."
