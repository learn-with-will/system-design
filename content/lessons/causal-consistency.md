---
slug: causal-consistency
title: "Causal Consistency"
topic: consistency-and-tradeoffs
kind: concept
summary: "Preserve cause-and-effect order across distributed events using Lamport timestamps and happens-before relationships."
tags: [causal-consistency, consistency-models, lamport-timestamps, ordering]
related: [linearizability-strong-consistency, eventual-consistency, read-after-write-and-monotonic-reads]
---
> **In one line:** Causal consistency guarantees that operations causally related by cause and effect are observed in the same order by all nodes.

## The idea
Between the strict, expensive world of Linearizability and the chaotic, unordered world of Eventual Consistency lies a powerful middle ground: **Causal Consistency**.

In physical reality, causality dictates that a cause must precede its effect:
- A user asks a question (Cause). A second user replies to that question (Effect).
- A post is published (Cause). A reader adds a comment referencing the post (Effect).

If a distributed database is merely eventually consistent, network delays might cause a replica to receive the reply *before* it receives the original question! To an observer reading from that replica, the conversation makes no sense: an answer appears floating in vacuum, followed seconds later by the question that prompted it.

**Causal consistency** formalizes Leslie Lamport's **happens-before relationship** ($a \to b$):
1. If event $a$ causally caused event $b$, every node in the system is guaranteed to observe event $a$ before observing event $b$.
2. Concurrent events that have no causal relationship (e.g., two users in different countries updating their bios at the same time) can be observed in different orders on different nodes.

Crucially, Mahajan et al. proved that **causal consistency is the strongest consistency model achievable in a completely partition-tolerant (available) system**. Unlike linearizability, causal consistency does not require a total global real-time clock, allowing systems to remain fast and available during network partitions.

## See it
Compare causal ordering with arbitrary concurrent events:

```sequence
actor alice: Alice
actor bob: Bob
actor charlie: Charlie (Observer)
alice -> bob: "Did the server crash?" (Question: Event A)
bob -> alice: "Yes, out of memory!" (Answer: Event B - Caused by A)
note charlie: Reads messages (never sees B before A)
```

```json
// Vector Clock / Version Vector tracking causality across 3 nodes
{
  "message_id": "msg_902",
  "text": "Yes, out of memory!",
  "caused_by": "msg_901",
  "vector_clock": {
    "node_us": 4,
    "node_eu": 2,
    "node_ap": 0
  }
}
```

> **Note:** The vector clock tracks causality across nodes. A replica will buffer `msg_902` and refuse to display it to readers until the local replica has caught up to `node_us: 4`.

## Go deeper
Causal consistency is tracked in distributed systems using **Vector Clocks** or **Version Vectors**. Each node maintains an array of logical counters representing known events on every other node. By attaching the vector clock to each message payload, receiving nodes mathematically determine whether one event preceded another or whether they occurred concurrently.
## Watch out
- Do not assume causal consistency orders unrelated concurrent events; two independent posts will have no guaranteed relative order across nodes.
- Vector clocks grow in size linearly with the number of participating nodes; pruning vector clocks requires garbage collection protocols.
## Remember
- Causal consistency guarantees that causally related events are observed in the same order by all replicas.
- It is the strongest consistency model that can remain available during network partitions.
- Causality is tracked mathematically using Lamport logical clocks or vector clocks.
