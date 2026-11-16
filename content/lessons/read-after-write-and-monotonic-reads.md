---
slug: read-after-write-and-monotonic-reads
title: "Client-Centric Consistency Models"
topic: consistency-and-tradeoffs
kind: pattern
summary: "Implement user-facing consistency: Read-Your-Writes, Monotonic Reads, and Monotonic Writes in asynchronous systems."
tags: [consistency-models, read-your-writes, monotonic-reads, client-centric]
related: [replication-lag-and-read-anomalies, eventual-consistency, causal-consistency]
---
> **In one line:** Client-centric consistency models guarantee intuitive, coherent behavior for individual users interacting with an eventually consistent system.

## The idea
While system-wide consistency models (like linearizability) focus on global state across all nodes and all users, **Client-Centric Consistency Models** focus on the experience of an individual user. Even when the broader distributed system is eventually consistent, an individual user expects their own personal interactions to follow coherent, intuitive rules.

The four canonical client-centric consistency guarantees are:

1. **Read-Your-Writes (Monotonic Read-After-Write):**
   A user who modifies data must always observe their own updates on subsequent reads. If Alice posts a status update, Alice must immediately see it on her feed, even if Bob in another country does not see it for another 500 milliseconds.
2. **Monotonic Reads:**
   If a user reads value $V_1$ at time $T_1$, they must never subsequently observe an older value $V_0$ at time $T_2$. This prevents the "time travel" anomaly where refreshing a feed causes recently seen posts to vanish.
3. **Monotonic Writes:**
   A user's sequential write operations must be processed by the system in the exact order they were submitted. If a user creates an account and immediately uploads a profile photo, the system must not process the photo upload before the account record exists.
4. **Writes-Follow-Reads (Causal Writes):**
   If a user reads value $V_1$ and then submits write $W_2$, any other user who subsequently observes $W_2$ must also observe $V_1$.

These guarantees are implemented using client session tracking, version tokens (cookies), and affinity routing (pinning a user's read requests to the same replica, or routing recent writers to the primary).

## See it
Compare client-centric guarantees across user interactions:

| Consistency Model | User Expectation | Common Failure Without It | Implementation Mechanism |
|---|---|---|---|
| **Read-Your-Writes** | "I should see what I just typed" | Submitting a form and seeing empty fields on reload | Route user to leader for 5s, or check client write timestamp |
| **Monotonic Reads** | "Time moves forward, not backward" | Refreshing page makes recent comments disappear | Pin user to specific read replica via user ID hash |
| **Monotonic Writes** | "My actions apply in the order I did them" | Profile update applies before user registration | Route writes from same user through single FIFO queue |
| **Writes-Follow-Reads** | "My reply follows the post I read" | Reply appears before the post it references | Propagate parent causal version in API payload |

```javascript
// Client-side Version Token pattern for Read-Your-Writes consistency
// 1. After write, server returns the database transaction LSN / version
const writeResponse = await fetch('/api/comments', { method: 'POST', body: JSON.stringify(comment) });
const { updatedLsn } = await writeResponse.json();

// 2. Subsequent reads pass the required minimum version token
const readResponse = await fetch('/api/comments', {
  headers: { 'X-Minimum-Version-LSN': updatedLsn }
});
// The router selects a replica whose applied LSN >= updatedLsn!
```

> **Tip:** Passing the client's last-seen version token in an HTTP header allows routing proxies to pick a read replica that has caught up, completely avoiding leader read bottlenecks.

## Go deeper
Session consistency is the formal term combining Read-Your-Writes, Monotonic Reads, and Monotonic Writes within a user's active session. In multi-region deployments, session consistency is maintained by assigning users a home region or routing user sessions through edge proxy stickiness.
## Watch out
- Do not rely on IP addresses for sticky session replica pinning; mobile phones change IP addresses as users switch cellular towers.
- Remember that client-centric consistency guarantees consistency only for *that specific user*; other users will still experience replication lag.
## Remember
- Client-centric models guarantee consistency from the perspective of an individual user.
- Read-Your-Writes ensures users immediately see their own submitted changes.
- Monotonic Reads prevents time-travel anomalies where repeated reloads serve older cached data.
