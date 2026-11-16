---
slug: latency-numbers-every-engineer-should-know
title: "Latency Numbers Every Engineer Should Know"
topic: estimation-and-capacity
kind: concept
summary: "Internalize the canonical latency figures from Jeff Dean to evaluate architectural performance orders of magnitude."
tags: [latency, estimation, hardware, performance]
related: [powers-of-two-and-data-units, estimating-qps-and-bandwidth, caching-fundamentals-and-tiers]
---
> **In one line:** Hardware and network operations span nine orders of magnitude, from sub-nanosecond CPU cache cycles to hundreds of milliseconds for cross-ocean round trips.

## The idea
In distributed systems, architectural choices succeed or fail based on physics and hardware reality. In 2012, Google fellow Jeff Dean popularized the canonical "Latency Numbers Every Programmer Should Know." These figures provide a mental ruler for understanding why caching, memory locality, and minimizing cross-datacenter round trips dictate system performance.

The critical insight from these numbers is not memorizing the exact nanoseconds, but understanding the **orders of magnitude** between different operations:
1. **L1 CPU Cache reference:** ~0.5–1 nanosecond (ns)
2. **L2 CPU Cache reference:** ~3–7 ns
3. **Mutex lock / unlock:** ~15–25 ns
4. **Main memory (RAM) reference:** ~100 ns
5. **Read 1 MB sequentially from memory:** ~3,000 ns (3 µs)
6. **SSD random read:** ~10–100 microseconds (µs)
7. **Read 1 MB sequentially from SSD:** ~200 µs
8. **Round trip within the same datacenter:** ~500 µs (0.5 ms)
9. **Disk seek (mechanical HDD):** ~1–10 ms
10. **Round trip from California to Netherlands:** ~150 ms (150,000,000 ns)

Reading from main memory (~100 ns) is roughly 1,000 times faster than reading randomly from a fast SSD (~100 µs), and an SSD read is roughly 1,000 times faster than a transatlantic network call (~150 ms). If a single user request requires ten sequential network round trips between distant datacenters, the response cannot physically complete faster than 1.5 seconds, regardless of how much CPU power is provisioned.

## See it
To appreciate the scale, humanize the numbers by scaling 1 nanosecond up to 1 second:

| Operation | Real Hardware Latency | Scaled (1 ns = 1 s) | Human Equivalent |
|---|---|---|---|
| **L1 CPU Cache reference** | 0.5 ns | 0.5 seconds | Single heartbeat |
| **Main Memory (RAM) reference** | 100 ns | 1.6 minutes | Quick coffee break |
| **SSD Random Read** | 50 µs | 13.8 hours | A long day's work |
| **Same Datacenter Round Trip** | 500 µs | 5.8 days | Nearly a full week |
| **Mechanical Disk Seek** | 5 ms | ~2 months | A season of the year |
| **CA to Europe Round Trip** | 150 ms | ~4.7 years | A college degree |

```text
Hierarchy of Access Latencies:
[L1/L2 Cache]   ~1 - 5 ns     ========================
[Main Memory]   ~100 ns       ================================================
[SSD Read]      ~50,000 ns    ========================================================================
[DC Network]    ~500,000 ns   ====================================================================================
[WAN Roundtrip] ~150,000,000ns ====================================================================================================
```

> **Watch out:** Light travels at approximately 300,000 km/s in a vacuum, but in fiber optic glass cables it travels at ~200,000 km/s. Over a 15,000 km transatlantic round trip, the physical transit of photons alone takes ~75 ms, before intermediate router processing!

## Go deeper
Notice the dramatic difference between sequential and random I/O. Reading 1 MB sequentially from disk or memory is orders of magnitude faster than performing 100 random lookups of 10 KB. This is why log-structured storage engines (like LSM-trees in Cassandra and RocksDB) turn random application writes into sequential append-only writes, achieving massive write throughput.
## Watch out
- Never treat latency figures as static guarantees; they represent approximate orders of magnitude that vary across hardware generations.
- Avoid architectures that require multiple sequential synchronous network calls across geographic regions.
## Remember
- Main memory access (~100 ns) is roughly 1,000x faster than SSD access (~50–100 µs).
- SSD access is roughly 1,000x faster than cross-ocean network calls (~150 ms).
- Sequential I/O is vastly faster than random I/O for both storage and memory.
