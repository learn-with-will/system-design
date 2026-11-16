---
slug: the-cap-theorem-explained
title: "The CAP Theorem Explained"
topic: consistency-and-tradeoffs
kind: concept
summary: "The precise mathematical formulation of Brewer's conjecture: linearizability vs availability during a network partition."
tags: [cap-theorem, distributed-systems, trade-offs, gilbert-lynch]
related: [cap-myths-and-nuance, the-pacelc-theorem, linearizability-strong-consistency]
---
> **In one line:** When a network partition occurs, a distributed system must choose between consistency (linearizability) and availability.

## The idea
First conjectured by Eric Brewer in 2000 and mathematically proven by Seth Gilbert and Nancy Lynch in 2002, the **CAP Theorem** is the most widely discussed principle in distributed systems design.

To understand CAP, you must understand the formal, exact definitions of its three terms:
- **Consistency (C):** Specifically means **Linearizability**. Every read operation receives the most recent write or an error. The multi-node cluster behaves as if it were a single atomic copy of data.
- **Availability (A):** Every non-failing node must return a **non-error response** for every received request (though without guaranteeing that it contains the most recent write). Returning an HTTP 500 error, timing out, or rejecting a write violates CAP availability.
- **Partition Tolerance (P):** The system continues to operate despite an arbitrary number of messages being dropped or delayed by the network between nodes.

**The Theorem Statement:**
In an asynchronous network where packets can be delayed or lost, **a distributed data store can guarantee at most two out of Consistency, Availability, and Partition Tolerance**.

Because physical networks (fiber cables, routers, cloud switches) are fundamentally subject to packet loss, hardware cuts, and latency spikes, **network partitions are an unavoidable physical reality**. Therefore, Partition Tolerance (P) is mandatory for any distributed system.

When a partition (P) occurs:
- If you choose **Consistency (CP):** Nodes that cannot communicate with the rest of the cluster must refuse to accept writes or return errors, rather than risk returning stale or conflicting data. You sacrifice Availability.
- If you choose **Availability (AP):** Both partitioned halves of the cluster continue accepting reads and writes locally. Replicas diverge, returning stale data and creating conflicting states. You sacrifice Consistency.

## See it
Visualize the fundamental trade-off forced during a network partition:

```flow
client1: User in New York | Writes X = 42 @primary
n1: Node US-East | Receives write @blue
partition: Network Partition! | Link severed between datacenters @red
n2: Node EU-West | Cannot contact Node US-East @amber
client2: User in London | Reads X @green
client1 -> n1: Write X = 42
n1 -> partition: Packets dropped
partition -> n2: Unreachable
client2 -> n2: Read X?
```

```yaml
# The CAP Decision during the partition:
cap_choice:
  option_cp:
    action: "Node EU-West returns HTTP 503 Service Unavailable"
    outcome: "Consistent (Linearizable), but UNAVAILABLE (Sacrifices A)"
  option_ap:
    action: "Node EU-West returns old value X = 0"
    outcome: "AVAILABLE (Returns 200 OK), but INCONSISTENT (Sacrifices C)"
```

> **Note:** There is no third option. Node EU-West must either answer (sacrificing consistency) or refuse to answer (sacrificing availability).

## Go deeper
Gilbert and Lynch's 2002 proof demonstrated that linearizability is impossible in an asynchronous network model if even a single network partition is tolerated. In practice, partitions are rarely permanent cuts; they are transient events caused by garbage collection pauses, packet routing reconfigurations, or switch reboots.
## Watch out
- Remember that the "C" in CAP means linearizability, NOT the "C" in ACID (which means application integrity constraints).
- Never claim a distributed database is "CA"; in the presence of a network, "CA" is not a valid architectural choice.
## Remember
- CAP states: when a network partition occurs, you must choose between consistency and availability.
- Consistency in CAP formally means linearizability; availability means non-failing nodes must return non-error responses.
- Partition tolerance is mandatory in distributed networks, making the real choice CP vs AP during failure events.
