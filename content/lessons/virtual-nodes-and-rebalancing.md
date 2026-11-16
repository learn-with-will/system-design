---
slug: virtual-nodes-and-rebalancing
title: "Virtual Nodes & Rebalancing"
topic: distributed-data
kind: technique
summary: "Smooth hash ring variance using virtual nodes (vnodes) and execute zero-downtime partition rebalancing."
tags: [consistent-hashing, vnodes, rebalancing, cassandra]
related: [consistent-hashing, sharding-fundamentals, hash-based-partitioning]
---
> **In one line:** Virtual nodes map each physical server to multiple positions on the hash ring, smoothing data distribution and simplifying rebalancing.

## The idea
While basic consistent hashing minimizes key migration during topology changes, it has a significant operational flaw: **non-uniform distribution**.

If you place only three physical servers (A, B, C) on a hash ring, their hashed positions are random. Server A and B might hash right next to each other, while Server C is far away. Consequently, Server C ends up owning 70% of the ring's keys, becoming heavily overloaded while Server A sits idle. Furthermore, when a node fails, its *entire* partition load dumps onto its immediate clockwise neighbor, potentially triggering a cascading collapse.

**Virtual Nodes (Vnodes):**
Amazon's Dynamo and Apache Cassandra solve this by introducing **Virtual Nodes**. Instead of mapping each physical server to a single point on the ring, each physical server is assigned multiple positions (typically 100 to 256 virtual tokens) across the ring:
- `Server A-1`, `Server A-2`, ..., `Server A-256`
- `Server B-1`, `Server B-2`, ..., `Server B-256`

Virtual nodes deliver three major advantages:
1. **Uniform Data Distribution:** By law of large numbers, scattering hundreds of tokens per server ensures that data and traffic are distributed with near-perfect uniformity.
2. **Heterogeneous Hardware Balancing:** Powerful servers with 64 cores can be assigned 512 virtual nodes, while smaller 16-core servers are assigned 128 virtual nodes, automatically balancing load by capacity.
3. **Smooth Failure Rebalancing:** When Physical Server A fails, its virtual nodes are interleaved throughout the ring. Its load is distributed evenly among *all* remaining servers in the cluster, rather than overwhelming a single neighbor.

## See it
Compare physical vs virtual node placement on the hash ring:

```tree
Hash Ring Partitioning
  Basic Consistent Hashing (3 Physical Nodes)
    Server A: 15% of ring (Underutilized) @blue
    Server B: 20% of ring (Moderate) @blue
    Server C: 65% of ring (Overloaded Hotspot!) @red
  Virtual Nodes (256 Vnodes per Physical Node)
    Server A: ~33.3% of ring (Uniform) @green
    Server B: ~33.3% of ring (Uniform) @green
    Server C: ~33.3% of ring (Uniform) @green
```

```yaml
# Apache Cassandra cassandra.yaml vnode configuration
cluster_name: 'ProductionCluster'
num_tokens: 128  # 128 virtual nodes per physical machine
initial_token: null # Cassandra auto-generates balanced tokens

# Streaming throughput throttling during partition rebalancing
stream_throughput_outbound_megabits_per_sec: 200
inter_dc_stream_throughput_outbound_megabits_per_sec: 50
```

> **Tip:** When adding a new physical node to a vnode cluster, the new node acquires a slice of tokens from *every* existing physical node. Rebalancing data streams in parallel across the entire cluster in small, non-disruptive chunks.

## Go deeper
During cluster rebalancing, streaming gigabytes of partition data across nodes can saturate network bandwidth and disk I/O, impacting live user queries. Production databases implement **rebalance rate-limiting** (e.g., capping streaming to 200 Mbps) to ensure background data migration never degrades customer-facing latencies.
## Watch out
- Do not set `num_tokens` excessively high (e.g., > 512); tracking token ranges in cluster metadata increases gossip overhead and slows range repair operations.
- Ensure data streaming during rebalancing is throttled to prevent saturating production database network interfaces.
## Remember
- Virtual nodes map each physical machine to hundreds of points across the hash ring.
- Vnodes eliminate skewed hot-spot partitions and smooth data distribution across nodes.
- When a node fails, vnodes distribute its load evenly across all remaining cluster members.
