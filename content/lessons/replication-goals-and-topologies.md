---
slug: replication-goals-and-topologies
title: "Replication Goals & Topologies"
topic: distributed-data
kind: concept
summary: "Explore why databases replicate data: high availability, read scaling, geographic latency, and topology models."
tags: [replication, databases, high-availability, distributed-systems]
related: [single-leader-replication, sync-vs-async-replication, multi-leader-and-leaderless-replication]
---
> **In one line:** Replication keeps copies of the same data on multiple physically separate nodes to provide high availability, read scaling, and disaster recovery.

## The idea
Storing all data on a single machine is an existential operational risk. Hard drives fail, network cables get severed, power supplies blow, and maintenance requires reboots. **Replication** means keeping a copy of the same data across multiple distinct physical servers connected via a network.

Replication fulfills three fundamental architectural goals:
1. **High Availability (Fault Tolerance):** If one server hardware node dies, the system continues operating seamlessly by failing over to an identical replica.
2. **Read Scalability:** In read-heavy workloads (where reads outnumber writes 100:1), traffic can be distributed horizontally across dozens of read replicas.
3. **Reduced Latency (Geographic Locality):** Placing replicas in datacenters physically closer to users (e.g., Tokyo, Frankfurt, Virginia) reduces network transit latency.

The difficulty in replication lies in handling **changes to data over time**. If data never changed, replicating it would be trivial: copy files once and serve. But when writes, updates, and deletes occur continuously, keeping multiple nodes synchronized across an asynchronous network is one of the foundational challenges of computer science.

There are three major replication topologies in distributed data systems:
- **Single-Leader (Primary-Follower):** All writes go to one designated leader; reads can go to the leader or any follower replica.
- **Multi-Leader (Active-Active):** Multiple nodes accept writes concurrently, requiring conflict resolution when concurrent writes clash.
- **Leaderless (Dynamo-Style):** Any node accepts writes and reads, using quorums ($W + R > N$) to ensure consistency.

## See it
Compare the three foundational replication topologies:

| Topology | Write Routing | Read Routing | Conflict Handling | Canonical Systems |
|---|---|---|---|---|
| **Single-Leader** | Strictly primary node only | Leader or any follower replica | No write conflicts (single serialized stream) | PostgreSQL, MySQL, Redis, MongoDB |
| **Multi-Leader** | Any regional leader node | Local regional leader / followers | Requires conflict resolution (LWW, CRDTs) | Multi-region Aurora, Couchbase |
| **Leaderless** | Any replica node (Coordinator) | Any replica node (Quorum read) | Quorum intersection ($W+R>N$), Read Repair | Cassandra, DynamoDB, Riak |

```flow
client-write: Write Client | Sends updates @primary
client-read: Read Client | Queries read replicas @neutral
leader: Leader Replica | Serializes WAL writes @blue
f1: Follower Node 1 | Read replica @green
f2: Follower Node 2 | Read replica @green
client-write -> leader: Write transaction
leader -> f1: Replication stream (Async)
leader -> f2: Replication stream (Async)
client-read -> f1: Read query
client-read -> f2: Read query
```

```yaml
# PostgreSQL primary-replica topology definition
replication_cluster:
  topology: single_leader
  leader:
    host: 10.0.1.10
    mode: read_write
  followers:
    - host: 10.0.1.21
      mode: read_only
      sync_mode: asynchronous
    - host: 10.0.1.22
      mode: read_only
      sync_mode: asynchronous
```

> **Tip:** Single-leader replication is by far the most popular and operationally stable topology. Unless you have strict multi-datacenter active write requirements, default to single-leader.

## Go deeper
Replication is fundamentally distinct from **Backups**. A replicated follower blindly executes whatever instructions the leader sends. If an engineer accidentally runs `DROP TABLE users;` on the primary, that statement is faithfully replicated to all followers in milliseconds! High availability survives hardware failure; backups survive human and software error.
## Watch out
- Never treat database replication as a substitute for off-site disaster recovery backups.
- Remember that scaling reads with asynchronous followers introduces replication lag and stale reads.
## Remember
- Replication provides fault tolerance, read scaling, and geographic locality by duplicating data.
- The three primary topologies are single-leader, multi-leader, and leaderless.
- Single-leader eliminates write conflict resolution and is the industry default for transactional storage.
