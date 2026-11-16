---
slug: replication-lag-and-read-anomalies
title: "Replication Lag & Read Anomalies"
topic: distributed-data
kind: pitfall
summary: "Diagnose and prevent read-after-write, monotonic read, and consistent prefix read anomalies caused by lag."
tags: [replication-lag, consistency, read-after-write, anomalies]
related: [single-leader-replication, sync-vs-async-replication, read-after-write-and-monotonic-reads]
---
> **In one line:** Replication lag causes asynchronous followers to serve stale reads, resulting in user-visible anomalies like disappearing updates and time travel.

## The idea
To scale read-heavy applications, architectures distribute read queries across multiple asynchronous followers. While followers will eventually process all leader writes, network congestion and heavy query loads introduce **replication lag**: a follower may be milliseconds, seconds, or minutes behind the leader.

Replication lag introduces three classic, user-visible read anomalies:

1. **Reading Your Own Writes (Read-After-Write Anomaly):**
   A user updates their profile (submitting a write to the leader). The user immediately reloads their profile page. The load balancer routes the read query to an asynchronous follower that has not yet received the update. The user sees their old profile, panics, and assumes their update failed!
   - *Solution:* Enforce **Read-Your-Writes consistency**. Route a user's reads to the leader for a 60-second window following any write by that user, or track client version timestamps.

2. **Monotonic Reads (Time Travel Anomaly):**
   A user refreshes a page multiple times. First, their query hits Follower A (which has 5 ms lag); they see a new comment. They refresh again, and their query hits Follower B (which has 500 ms lag); the comment vanishes! To the user, time appears to move backward.
   - *Solution:* Ensure that a specific user always queries the same replica (e.g., hash the user ID to select the read replica).

3. **Consistent Prefix Reads (Causality Violation):**
   In partitioned or distributed databases, if Answer follows Question causally, an observer must never see Answer before Question. If updates replicate out of order across separate shards, an observer sees responses before the question was asked.

## See it
Trace the Read-After-Write anomaly occurring over an asynchronous follower:

```sequence
actor user: Web User
actor leader: Primary Leader @primary
actor follower: Lagging Follower (Lag: 2 sec) @red
user -> leader: POST /profile (Update name to "Jane")
note leader: Commit write to WAL
leader --> user: 200 OK (Saved!)
user -> follower: GET /profile (Instant page reload)
note follower: Follower has not received WAL stream yet! @amber
follower --> user: Returns old name ("Alice")
```

```javascript
// Application-level Read-After-Write consistency middleware
async function getProfile(req, res) {
  const userId = req.user.id;
  const lastWriteTime = await redis.get(`last_write:${userId}`);

  // If user performed a write within the last 5 seconds, read from LEADER
  if (lastWriteTime && (Date.now() - parseInt(lastWriteTime)) < 5000) {
    const profile = await dbLeader.query('SELECT * FROM profiles WHERE id = $1', [userId]);
    return res.json(profile.rows[0]);
  }

  // Otherwise, safe to read from scaled read-only FOLLOWER pool
  const profile = await dbFollowerPool.query('SELECT * FROM profiles WHERE id = $1', [userId]);
  return res.json(profile.rows[0]);
}
```

> **Tip:** By routing only the active user's reads to the leader for a short 5-second window, you preserve read-your-writes guarantees while offloading 99% of global traffic to follower replicas.

## Go deeper
Under heavy write load, replication lag can grow unboundedly. If followers become saturated with complex read queries, their replication apply thread starves, causing lag to increase from milliseconds to hours. Production systems alert on replication lag byte offsets (`pg_wal_lsn_diff`) and automatically drop heavily lagging followers from the read pool.
## Watch out
- Do not assume replication lag is always sub-second; heavy analytical queries on followers can stall replication threads for minutes.
- Never send authorization or security verification checks to asynchronous read replicas; always verify permissions against the leader.
## Remember
- Replication lag introduces read-after-write, monotonic read, and causality anomalies.
- Read-Your-Writes consistency guarantees a user always sees their own submitted updates.
- Monotonic reads prevent time-travel anomalies by ensuring a user's sequential reads never hit an older replica.
