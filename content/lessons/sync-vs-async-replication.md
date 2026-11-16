---
slug: sync-vs-async-replication
title: "Sync vs Async Replication"
topic: distributed-data
kind: concept
summary: "Weigh zero-data-loss durability against write latency: synchronous, asynchronous, and semi-synchronous replication."
tags: [replication, synchronous, asynchronous, durability]
related: [single-leader-replication, replication-lag-and-read-anomalies, the-cap-theorem-explained]
---
> **In one line:** Synchronous replication guarantees zero data loss by blocking writes until followers confirm, while asynchronous replication offers low latency at the risk of losing unpropagated writes.

## The idea
In leader-based replication, a fundamental architectural choice is when to return success to the client: immediately after the leader writes locally, or only after followers have confirmed receipt?

There are three operating modes:

1. **Synchronous Replication:**
   The leader writes locally, transmits the log to the follower, and **blocks**, waiting for the follower to acknowledge that it has received and written the data. Only then does the leader return success to the client.
   - *Advantage:* Guarantees that the follower has an up-to-date copy of data. If the leader abruptly crashes, zero committed data is lost.
   - *Disadvantage:* High write latency (pays the round-trip network time to the follower). Furthermore, if the synchronous follower crashes, the leader cannot process any writes; the entire cluster stalls!

2. **Asynchronous Replication:**
   The leader writes locally and immediately returns success to the client. The replication stream is transmitted to followers in the background asynchronously.
   - *Advantage:* Fast write latency. A slow or dead follower has zero impact on the leader's write throughput.
   - *Disadvantage:* **Vulnerable to data loss.** If the leader crashes before the unpropagated writes reach followers, those transactions are permanently lost upon failover.

3. **Semi-Synchronous Replication (The Industry Standard):**
   A pragmatic compromise adopted by PostgreSQL and MySQL. Exactly **one** follower is configured as synchronous, while remaining followers are asynchronous. If the synchronous follower becomes unreachable, another follower is promoted to synchronous mode, ensuring at least two nodes hold every committed transaction without stalling all writes.

## See it
Compare write latency and failover durability across replication modes:

| Mode | Write Blocking Behavior | Write Latency | Durability Guarantee | Availability on Follower Crash |
|---|---|---|---|---|
| **Fully Synchronous** | Blocks until all followers acknowledge | High (slowest follower dictates speed) | Zero data loss guaranteed | Cluster stalls; cannot accept writes |
| **Fully Asynchronous** | Returns immediately after leader disk write | Ultra-low (local write speed) | **Data loss risk** on leader crash | High; dead followers ignored |
| **Semi-Synchronous** | Blocks on exactly 1 follower acknowledgment | Moderate (one local network hop) | High (at least 2 nodes hold data) | Fallback to next follower |

```sequence
actor client: Writing Client @neutral
actor leader: Primary Leader @primary
actor sync-f: Sync Follower @green
actor async-f: Async Follower @blue
client -> leader: INSERT transaction
leader -> sync-f: Transmit WAL & block
sync-f --> leader: ACK: Write confirmed!
leader --> client: 201 Created (Committed)
leader -> async-f: Async replication stream
```

```yaml
# PostgreSQL semi-synchronous configuration in postgresql.conf
# Requires at least 1 synchronous follower confirmation before commit
synchronous_commit = on
synchronous_standby_names = 'FIRST 1 (pg_replica_1, pg_replica_2)'
```

> **Note:** With `FIRST 1`, PostgreSQL blocks until either `pg_replica_1` or `pg_replica_2` acknowledges receipt, guaranteeing dual-node persistence before confirming success to the application.

## Go deeper
GitHub suffered a major production outage in 2018 triggered by asynchronous replication lag during a network partition. When an automated failover promoted an asynchronous MySQL replica that was slightly behind the old primary, un-replicated commits were lost, causing database primary key collisions when the old primary re-joined.
## Watch out
- Never run fully synchronous replication across all nodes in large clusters; any single lagging node will block all cluster writes.
- Be prepared for data loss during failover in fully asynchronous clusters; track replication lag metrics continuously.
## Remember
- Synchronous replication eliminates data loss on failover but blocks writes and reduces availability.
- Asynchronous replication delivers maximum write speed but risks losing unpropagated commits during failover.
- Semi-synchronous replication guarantees dual-node durability by requiring exactly one follower confirmation.
