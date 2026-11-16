---
slug: partitioned-logs-and-consumer-groups
title: "Partitioned Logs & Consumer Groups"
topic: asynchronous-systems
kind: technique
summary: "Scale event stream consumption horizontally using Kafka topic partitioning and consumer group offset management."
tags: [kafka, partitions, consumer-groups, streaming]
related: [message-queues-vs-event-logs, publish-subscribe-pattern, delivery-semantics-and-deduplication]
---
> **In one line:** Topics are split into partitions to scale horizontally, while consumer groups assign each partition to exactly one consumer instance for parallel processing.

## The idea
In distributed event streaming architectures (like Apache Kafka), a single append-only log on one server cannot scale indefinitely: a single disk has finite write throughput, and a single consumer thread cannot process hundreds of thousands of events per second.

Kafka solves this scalability constraint through two core primitives:

**1. Topic Partitions:**
A topic is divided horizontally into multiple independent **partitions** distributed across different cluster broker nodes.
- When a producer publishes an event with a **key** (e.g., `user_id`), Kafka hashes the key (`Murmur2(key) % num_partitions`) to select the partition.
- **Strict Ordering Guarantee:** Events within a single partition are guaranteed to be stored and processed in exact chronological order. However, **no ordering is guaranteed across different partitions**.

**2. Consumer Groups:**
A **consumer group** is a set of cooperating worker processes that collectively consume all partitions of a topic:
- Each partition is assigned to **exactly one consumer instance** within the group.
- If a topic has 4 partitions and a consumer group has 4 instances, each worker consumes exactly 1 partition in parallel.
- If a consumer instance crashes, Kafka triggers a **group rebalance**, automatically reassigning the dead worker's partitions to remaining healthy consumers.
- If a consumer group has *more* instances than partitions (e.g., 6 consumers for 4 partitions), the extra 2 instances sit idle as hot standbys.

## See it
Consider how a 4-partition topic maps to a 4-instance consumer group:

```flow
p0: Partition 0 | Hashed users @blue
p1: Partition 1 | Hashed users @blue
p2: Partition 2 | Hashed users @blue
p3: Partition 3 | Hashed users @blue
c1: Consumer Instance 1 | Reads Partition 0 @green
c2: Consumer Instance 2 | Reads Partition 1 @green
c3: Consumer Instance 3 | Reads Partition 2 @green
c4: Consumer Instance 4 | Reads Partition 3 @green
p0 -> c1: Stream events in-order
p1 -> c2: Stream events in-order
p2 -> c3: Stream events in-order
p3 -> c4: Stream events in-order
```

```yaml
# Kafka Consumer Group configuration
consumer_config:
  bootstrap_servers: "kafka-1:9092,kafka-2:9092"
  group_id: "order-billing-processors"
  enable_auto_commit: false # Manual commit prevents data loss!
  auto_offset_reset: "earliest"
  max_poll_records: 500
```

> **Tip:** The number of partitions in a topic represents the **maximum degree of parallelism** for any single consumer group. If you need 16 parallel consumer threads, the topic must have at least 16 partitions.

## Go deeper
If a consumer instance takes too long to process a batch of messages (exceeding `max.poll.interval.ms`), the Kafka coordinator assumes the consumer is deadlocked and triggers an expensive cluster rebalance, pausing message processing across all other healthy consumers. Long-running tasks must be offloaded to internal thread pools or task queues.
## Watch out
- Do not choose a low-cardinality partition key (e.g., country code); uneven data will create a hot partition that overwhelms a single consumer.
- Remember that message ordering is guaranteed only within a single partition, never across partitions.
## Remember
- Topic partitions allow distributed brokers to scale write throughput across multiple disks.
- Consumer groups distribute partitions so each partition is read by exactly one consumer instance.
- Strict message ordering is preserved per partition key, while different partition keys process in parallel.
