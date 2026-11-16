---
slug: range-based-partitioning
title: "Range-Based Partitioning"
topic: distributed-data
kind: technique
summary: "Partition data by contiguous key ranges to enable fast range scans while managing the risk of write hot spots."
tags: [sharding, range-partitioning, databases, hot-spots]
related: [sharding-fundamentals, hash-based-partitioning, consistent-hashing]
---
> **In one line:** Range-based partitioning assigns contiguous ranges of keys to each shard, making range queries efficient but risking write hot spots.

## The idea
In range-based partitioning, each shard is assigned a continuous, ordered range of partition key values (analogous to volumes in an encyclopedia: Volume 1 covers A–Am, Volume 2 covers An–Az). For example:
- Shard 1: User IDs 1 to 10,000
- Shard 2: User IDs 10,001 to 20,000
- Shard 3: User IDs 20,001 to 30,000

The ranges do not need to be evenly spaced. If there are vastly more users with names starting with 'S' than 'X', the boundaries are placed dynamically to keep data volumes roughly equal across shards.

**The Major Advantage: Fast Range Scans**
Because keys are stored in sorted order within shards, range queries are exceptionally efficient. If an application queries:
`SELECT * FROM sensor_readings WHERE timestamp BETWEEN '2026-11-01' AND '2026-11-07'`
The router knows the exact shard or two that contain this week's data. It queries only those specific shards and reads the records in sorted order.

**The Major Vulnerability: Write Hot Spots**
The fatal flaw of range partitioning occurs when using monotonically increasing keys, such as auto-incrementing IDs or timestamps. If sensor telemetry is partitioned by timestamp, **every single write in the current minute is directed to the single shard responsible for the current time**. That one shard suffers 100% of write traffic, while all historical shards sit completely idle.

## See it
Compare how range partitioning handles queries vs the write hot-spot hazard:

| Feature Dimension | Range-Based Partitioning | Hash-Based Partitioning |
|---|---|---|
| **Range Queries (`WHERE k BETWEEN a AND b`)** | Optimal; targets 1 or few shards | Slow; must scatter-gather to all shards |
| **Write Distribution (Sequential Keys)** | **Terrible; 100% of writes hit the latest shard** | Uniform; spreads writes across all nodes |
| **Boundary Rebalancing** | Splits/merges ranges dynamically | Resizes hash ring via virtual nodes |
| **Routing Metadata** | Dynamic routing table (Range -> Shard ID) | Static mathematical hash algorithm |

```sql
-- Range partitioning in PostgreSQL by date
CREATE TABLE sensor_telemetry (
  id BIGSERIAL,
  recorded_at DATE NOT NULL,
  sensor_id UUID NOT NULL,
  metric_value NUMERIC(10,2)
) PARTITION BY RANGE (recorded_at);

-- Each month's data resides in its own isolated physical table
CREATE TABLE telemetry_2026_10 PARTITION OF sensor_telemetry
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

CREATE TABLE telemetry_2026_11 PARTITION OF sensor_telemetry
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
```

> **Watch out:** If you partition by `recorded_at`, all writes on November 16th will hit `telemetry_2026_11`, overloading that single table's disk buffers.

## Go deeper
To avoid write hot spots when partitioning by time, architectures use **compound keys**: prefixing the timestamp with a hashed tenant ID or sensor ID (e.g., `sensor_id_hash + timestamp`). Writes from thousands of distinct sensors scatter uniformly across all shards, while range queries for an individual sensor still execute efficiently on a single shard.
## Watch out
- Never use monotonically increasing primary keys (like auto-increment IDs or timestamps) as the sole range partition key.
- Ensure dynamic range boundaries are monitored; uneven growth can create "fat shards" with 10x the storage of other nodes.
## Remember
- Range partitioning groups sorted keys into contiguous boundaries on each shard.
- Range queries execute efficiently because sorted data is localized to specific nodes.
- Sequential keys create severe write hot spots, routing 100% of incoming writes to the newest shard.
