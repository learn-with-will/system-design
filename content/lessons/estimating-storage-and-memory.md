---
slug: estimating-storage-and-memory
title: "Estimating Storage & Memory"
topic: estimation-and-capacity
kind: technique
summary: "Calculate multi-year disk capacity, index overheads, retention policies, and cache memory working sets."
tags: [storage, memory, capacity-planning, estimation]
related: [powers-of-two-and-data-units, estimating-qps-and-bandwidth, caching-fundamentals-and-tiers]
---
> **In one line:** Storage estimation accounts for write rate, retention period, index overhead, and replication factors; memory sizing targets the 80/20 active working set.

## The idea
Estimating storage requirements determines your database sizing, disk provisioning, backup planning, and infrastructure costs. Sizing storage requires looking beyond the raw user payload and factoring in metadata, indexes, data retention windows, and replication multipliers.

A complete storage calculation incorporates:
1. **Raw Storage per Day:** $\text{Daily Writes} \times \text{Average Payload Size}$.
2. **Metadata and Index Overhead:** Every database row carries storage overhead: primary key B-tree indexes, foreign keys, timestamps, and row headers. As a rule of thumb, add **20% to 50%** overhead on top of raw payload bytes for relational and document stores.
3. **Multi-Year Retention:** Calculate storage over the required business lifetime (typically 3 to 5 years):
$$\text{Total Data} = \text{Daily Storage} \times 365 \times \text{Years}$$
4. **Replication Multiplier:** Production databases store multiple copies of data for high availability. A standard 3-node cluster (one primary, two replicas) multiplies storage by **3x**.
5. **Memory Sizing (The 80/20 Rule):** In caching and database buffer pool sizing, the Pareto Principle generally applies: 20% of the content generates 80% of the read requests. To achieve high cache hit ratios, size your in-memory cache to hold **20% of your daily active working set**.

## See it
Consider sizing storage and cache memory for an enterprise messaging platform:

```text
Assumptions:
- Messages sent per day: 100 Million
- Average message payload: 500 bytes
- Metadata & index overhead: 30% (150 bytes) -> Total message size: 650 bytes
- Data retention requirement: 5 years
- Replication factor: 3 copies

Step 1: Daily Storage
- Daily Storage = 100,000,000 * 650 bytes = 65 GB / day

Step 2: 5-Year Storage
- 5-Year Data = 65 GB/day * 365 days * 5 years ≈ 118.6 TB

Step 3: Storage with 3x Replication
- Total Provisioned Disk = 118.6 TB * 3 = ~355.8 TB

Step 4: Memory Cache Sizing (80/20 Rule for 1 Day's Active Messages)
- Daily Active Messages = 100 Million * 650 bytes = 65 GB
- Cache 20% of Daily Active Data = 65 GB * 0.20 = 13 GB RAM
```

```json
{
  "storage_projection": {
    "daily_net_new_gb": 65,
    "annual_growth_tb": 23.7,
    "five_year_raw_tb": 118.6,
    "five_year_replicated_tb": 355.8,
    "recommended_cache_ram_gb": 32
  }
}
```

> **Tip:** Notice that while five-year storage requires over 355 TB of disk, caching 20% of the daily hot data requires only 13 GB of RAM, easily fitting on a single modest Redis node!

## Go deeper
Storage tiering is essential for cost management. Retaining petabytes of historical data on high-performance NVMe SSDs is financially prohibitive. Modern architectures tier data: hot data (last 30 days) lives on SSDs and in memory caches; warm data (last year) resides on lower-cost object storage or magnetic disks; and cold archive data (older than one year) is compressed and moved to Glacier/cold storage tiers.
## Watch out
- Do not forget replication and secondary indexes; raw payload size is frequently less than half of actual disk consumption.
- Account for write amplification in append-only storage and log-structured merge trees.
## Remember
- Storage sizing must factor in index overhead (20–50%), retention duration, and replication factors (typically 3x).
- The 80/20 rule states that caching 20% of daily active data generally captures 80% of read traffic.
- Implement multi-temperature storage tiering (hot, warm, cold) to control long-term data costs.
