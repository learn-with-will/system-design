---
slug: multi-leader-and-leaderless-replication
title: "Multi-Leader & Leaderless Replication"
topic: distributed-data
kind: pattern
summary: "Explore multi-datacenter active-active clusters, write conflicts, CRDTs, and Dynamo quorum replication (W + R > N)."
tags: [multi-leader, leaderless, dynamo, quorums]
related: [replication-goals-and-topologies, linearizability-strong-consistency, eventual-consistency]
---
> **In one line:** Multi-leader allows writes across regional primaries; leaderless systems use quorum intersection ($W + R > N$) to ensure consistency without leaders.

## The idea
While single-leader replication is simple and eliminates write conflicts, all writes must travel across the globe to that single leader. In multi-region deployments, this incurs cross-ocean latency on every write and leaves the entire write path vulnerable if the leader's datacenter experiences an outage.

Two decentralized topologies address these limitations:

**1. Multi-Leader (Active-Active) Replication:**
Multiple nodes—typically one in each geographic region (e.g., US-East, Europe, Asia)—act as leaders concurrently. A user in London writes to the Europe leader with local 5 ms latency, and that write is asynchronously replicated to the US and Asia leaders.
- *The Catch:* **Write Conflicts.** If User A in London updates a document's title to "Title X" at the exact same millisecond that User B in New York updates it to "Title Y", both regional leaders accept the write. When the updates replicate, they collide!
- *Resolution Strategies:* Last Write Wins (LWW) based on timestamps (causes data loss if clocks drift), Conflict-Free Replicated Data Types (CRDTs), or application-level merge functions.

**2. Leaderless (Dynamo-Style) Replication:**
Pioneered by Amazon's Dynamo paper (2007) and implemented in Apache Cassandra and Riak, leaderless architectures abandon the concept of a leader entirely. Clients send writes directly to multiple replica nodes in parallel.
Consistency is maintained using **Quorum Math**:
- Let $N$ = total number of replicas storing a key.
- Let $W$ = number of replicas that must acknowledge a write before it is considered successful.
- Let $R$ = number of replicas that must respond to a read query.
If **$W + R > N$**, the read set and the write set are guaranteed to overlap in at least one node by the Pigeonhole Principle. That overlapping node holds the latest version of the data!

## See it
Visualize the quorum intersection in a leaderless cluster ($N=3, W=2, R=2$):

```flow
client-w: Writer Client | Writes with W=2 @primary
client-r: Reader Client | Reads with R=2 @green
n1: Node 1 | Receives Write (Version 2) @blue
n2: Node 2 (Overlap) | Holds Version 2 @green
n3: Node 3 | Stale (Version 1) @amber
client-w -> n1: Write v2 (ACK)
client-w -> n2: Write v2 (ACK)
client-r -> n2: Read query (Sees v2)
client-r -> n3: Read query (Sees v1)
```

```bash
# Cassandra CQL creating a keyspace with NetworkTopologyStrategy
CREATE KEYSPACE ecommerce
WITH replication = {
  'class': 'NetworkTopologyStrategy',
  'us-east': 3,
  'eu-central': 3
};

-- Executing a write with QUORUM consistency:
-- Requires (3/2)+1 = 2 ACKs per datacenter
CONSISTENCY QUORUM;
INSERT INTO shopping_cart (user_id, item_id, count) VALUES ('usr_482', 'item_99', 1);
```

> **Tip:** If a leaderless read detects that Node 3 returned an older version than Node 2, the client triggers **Read Repair**: it returns version 2 to the user and asynchronously writes version 2 back to Node 3.

## Go deeper
Conflict-Free Replicated Data Types (CRDTs) allow concurrent updates across multi-leader nodes to merge mathematically without conflicts. For instance, a Grow-Only Counter (P-N Counter) tracks increments and decrements per node; the global total is simply the sum of all node registers, guaranteeing identical convergence regardless of network packet arrival order.
## Watch out
- Do not rely blindly on Last Write Wins (LWW) for conflict resolution; NTP clock skew between servers will silently discard valid customer writes.
- Remember that if $W + R \le N$, reads can completely miss the latest writes, degrading consistency to eventual consistency.
## Remember
- Multi-leader enables local write latency across regions but requires write conflict resolution.
- Leaderless clusters use quorums ($W + R > N$) to guarantee that read and write sets overlap on the latest data.
- Read repair and background anti-entropy processes repair out-of-date replicas in leaderless systems.
