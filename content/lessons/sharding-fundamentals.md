---
slug: sharding-fundamentals
title: "Sharding Fundamentals"
topic: distributed-data
kind: concept
summary: "Overcome single-node database limits by horizontally partitioning data across independent storage shards."
tags: [sharding, partitioning, horizontal-scaling, databases]
related: [range-based-partitioning, hash-based-partitioning, consistent-hashing]
---
> **In one line:** Sharding splits a large database horizontally across multiple independent database servers so each node stores a distinct subset of data.

## The idea
When a dataset grows to hundreds of terabytes or write throughput hits hundreds of thousands of operations per second, a single database server—even with read replicas—reaches its physical limits. Replication scales *reads*, but it does not scale *writes* (all writes still hit the primary) or *storage capacity* (every node stores a full copy of the entire dataset).

**Sharding** (horizontal database partitioning) solves this by breaking the dataset into mutually exclusive subsets called **shards**. Each shard is an independent database instance running on its own physical hardware. A shard contains a fraction of the rows of a table (e.g., Shard 1 holds rows 1–1,000,000, Shard 2 holds 1,000,001–2,000,000).

The key that determines which shard stores a specific record is the **Shard Key (Partition Key)**. When an application queries or writes data, the database router hashes or evaluates the shard key to route the request directly to the single shard responsible for that record.

However, sharding introduces immense architectural complexity:
- **Cross-Shard Joins:** Joining tables that reside on different physical servers requires network serialization and distributed query processing, which is notoriously slow.
- **Cross-Shard Transactions:** Executing atomic transactions spanning multiple shards requires distributed two-phase commit (2PC), which degrades throughput.
- **Rebalancing:** As data grows or servers are added, moving gigabytes of data between live shards without downtime is exceptionally challenging.

## See it
Consider how an application routes queries to specific database shards using a shard key:

```flow
client: Application Tier | Executes queries @primary
router: Query Router / Proxy | Evaluates Shard Key @blue
shard1: Shard 1 (Node A) | Users A - H @green
shard2: Shard 2 (Node B) | Users I - P @green
shard3: Shard 3 (Node C) | Users Q - Z @green
client -> router: SELECT * WHERE user_id = 'Jane'
router -> shard2: Direct query (Targeted lookup)
client -> router: SELECT * WHERE user_id = 'Bob'
router -> shard1: Direct query (Targeted lookup)
```

```yaml
# Sharding architecture configuration
sharding_cluster:
  table: user_profiles
  partition_key: user_id
  shards:
    - id: shard_01
      host: db-shard-1.internal:5432
      range: "00000000 - 3fffffff"
    - id: shard_02
      host: db-shard-2.internal:5432
      range: "40000000 - 7fffffff"
    - id: shard_03
      host: db-shard-3.internal:5432
      range: "80000000 - bfffffff"
    - id: shard_04
      host: db-shard-4.internal:5432
      range: "c0000000 - ffffffff"
```

> **Tip:** If a query does not include the shard key (e.g., `SELECT * FROM orders WHERE status = 'shipped'`), the router must execute a **Scatter-Gather** query: broadcasting the query to all shards in parallel and merging the results in memory.

## Go deeper
To maintain high availability within a sharded cluster, **each individual shard is itself a replicated cluster** (typically a single-leader replica set with 1 primary and 2 followers). Sharding provides horizontal capacity scaling; replication within each shard provides fault tolerance.
## Watch out
- Do not shard prematurely; exhausting vertical scaling, read replicas, and caching is vastly simpler than managing sharded databases.
- Selecting the wrong shard key is catastrophic; re-sharding an active production database of hundreds of terabytes takes months of risky migrations.
## Remember
- Sharding divides a large table horizontally across independent nodes to scale storage and write capacity.
- The shard key determines which physical node stores a given record.
- Cross-shard joins and distributed transactions are slow; choose shard keys that keep related data on the same node.
