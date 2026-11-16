---
slug: eventual-consistency
title: "Eventual Consistency"
topic: consistency-and-tradeoffs
kind: concept
summary: "Embrace high availability and partition tolerance by allowing replicas to converge asynchronously over time."
tags: [eventual-consistency, consistency-models, nosql, high-availability]
related: [linearizability-strong-consistency, causal-consistency, the-cap-theorem-explained]
---
> **In one line:** Eventual consistency guarantees that if no new updates are made, all replicas will eventually converge to identical values.

## The idea
In distributed systems operating across geographical regions or unreliable networks, guaranteeing linearizability (strong consistency) requires synchronous network round trips and locking, severely limiting write throughput and reducing availability during network partitions.

**Eventual Consistency** represents the opposite end of the consistency spectrum. It is an optimistic, asynchronous consistency model:
- Replicas accept writes and reads locally without coordinating synchronously across the entire cluster.
- Updates propagate asynchronously in the background via gossip protocols, anti-entropy sync, or replication streams.
- If no further updates are made to a specific record, all replicas in the cluster are guaranteed to **eventually converge** to the identical state.

The key trade-off is that in the short term, different clients querying different replicas may observe different, conflicting, or stale values. Eventual consistency is widely adopted by high-scale systems (Amazon DynamoDB, Apache Cassandra, DNS, and Git) because it delivers extraordinary write throughput and 100% write availability: even if half the network is disconnected, local nodes continue accepting writes.

Eventual consistency is well suited for user-facing applications where immediate global precision is unnecessary. On YouTube, if a video view count shows 1,420 views on one server and 1,425 views on another, users do not notice; what matters is that the page loads in 50 milliseconds.

## See it
Trace the convergence timeline in an eventually consistent cluster:

```flow
client: User A | Updates status to "Online" @primary
n1: Node 1 (Local) | State: "Online" (Immediate) @green
n2: Node 2 (Lagging) | State: "Offline" (Stale) @amber
n3: Node 3 (Lagging) | State: "Offline" (Stale) @amber
client -> n1: Write status = "Online"
n1 -> n2: Gossip replication (t = 150ms)
n1 -> n3: Gossip replication (t = 300ms)
```

```yaml
# AWS DynamoDB eventual consistency query configuration
# By default, DynamoDB reads are eventually consistent, costing 50% fewer RCUs
dynamodb_query:
  table_name: "UserActivities"
  key_condition_expression: "UserId = :uid"
  consistent_read: false # Eventual consistency: 0.5 Read Capacity Unit (RCU)
  # vs consistent_read: true # Strongly consistent: 1.0 RCU (Double the cost!)
```

> **Tip:** In cloud databases like DynamoDB, eventually consistent reads cost half as much as strongly consistent reads and deliver lower p99 latency.

## Go deeper
The word "eventually" in eventual consistency provides no guaranteed upper time bound. In a healthy datacenter, convergence occurs within 50 to 200 milliseconds. However, during a major network partition or under extreme server queue saturation, convergence can take hours. Systems mitigate this by layering client-centric guarantees (such as read-your-writes) on top of eventual consistency.
## Watch out
- Do not use eventual consistency for inventory counts during high-concurrency ticket sales or financial accounting ledgers.
- Remember that concurrent conflicting writes in an eventually consistent store require deterministic conflict resolution (CRDTs or version vectors).
## Remember
- Eventual consistency guarantees convergence over time if no new updates occur.
- It maximizes availability and write throughput by eliminating synchronous cross-node locking.
- Eventual consistency is ideal for social feeds, view counters, reviews, and collaborative document editing.
