---
slug: single-leader-replication
title: "Single-Leader Replication"
topic: distributed-data
kind: pattern
summary: "How primary-follower replication operates, write-ahead log shipping, and automated failover mechanics."
tags: [replication, single-leader, postgres, failover]
related: [replication-goals-and-topologies, sync-vs-async-replication, replication-lag-and-read-anomalies]
---
> **In one line:** In single-leader replication, all writes route strictly to one primary node, which replicates log changes to one or more read-only followers.

## The idea
Single-leader replication (also known as master-slave or primary-replica) is the most widely deployed replication model in relational and document databases (including PostgreSQL, MySQL, and MongoDB).

The rules of single-leader replication are straightforward:
1. **One designated Leader (Primary):** Any client wishing to write data (insert, update, delete) must send its request to the leader. The leader writes the new data to its local storage and appends the operation to its **Write-Ahead Log (WAL)** or replication change log.
2. **Multiple Followers (Replicas):** Whenever the leader writes data, it streams the change log to all followers. Each follower reads the log stream in sequential order and applies the exact same mutations to its local database copy in the exact same sequence.
3. **Read Distribution:** Clients can submit read queries to the leader or to any of the followers. However, only the leader can accept writes.

**Failover Mechanics:**
If the leader crashes, the cluster must execute a **failover**:
1. *Detection:* Nodes exchange periodic heartbeats. If the leader fails to respond for a timeout window (e.g., 30 seconds), it is declared dead.
2. *Leader Election:* Remaining followers elect a new leader (typically the follower with the most up-to-date replication log, via Raft or an external coordinator like Consul or ZooKeeper).
3. *Reconfiguration:* The load balancer and client connection pools are re-routed to point write traffic to the new leader. If the old leader comes back online, it must step down and re-join the cluster as a follower.

## See it
Trace the write and read paths in a single-leader replication architecture:

```sequence
actor writer: Writing Client
actor reader: Reading Client
actor leader: Leader Node @primary
actor follower: Follower Node @green
writer -> leader: INSERT INTO orders ... (Write)
note leader: Append to WAL & Commit
leader -> follower: Ship WAL Replication Stream
note follower: Apply WAL sequential mutation
leader --> writer: Write Confirmed (201 Created)
reader -> follower: SELECT * FROM orders ... (Read)
follower --> reader: Return order data
```

```sql
-- Verifying PostgreSQL replication lag and follower status on Leader
SELECT 
  client_addr AS follower_ip,
  state,
  sync_state,
  replay_lag,
  write_lag
FROM pg_stat_replication;

-- Sample Output:
-- follower_ip | state     | sync_state | replay_lag
-- 10.0.1.21   | streaming | async      | 00:00:00.012 (12 ms lag)
-- 10.0.1.22   | streaming | async      | 00:00:00.008 (8 ms lag)
```

> **Note:** Notice that write throughput is strictly limited by the capacity of the single leader node. Single-leader replication scales *read* traffic, not *write* traffic.

## Go deeper
A dangerous failover hazard is **Split-Brain**. If a network partition isolates the leader from the followers, the followers may believe the leader died and elect a new leader, while the original leader continues accepting writes from an isolated network segment. With two active leaders accepting conflicting writes, data becomes irrecoverably corrupt. Clusters combat split-brain by requiring **majority quorums** for leader elections and implementing **fencing (STONITH - Shoot The Other Node In The Head)** to forcibly power down rogue leaders.
## Watch out
- Be alert to split-brain risks during automated failover; always require majority consensus before promoting a new leader.
- Do not route read-after-write operations to asynchronous followers; users will not see their own updates.
## Remember
- All writes execute on the single leader; reads can scale across multiple followers.
- Followers maintain consistency by sequentially replaying the leader's Write-Ahead Log.
- Automated failover detects leader failure and promotes the most up-to-date follower, guarding against split-brain.
