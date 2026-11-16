---
slug: message-queues-vs-event-logs
title: "Message Queues vs Event Logs"
topic: asynchronous-systems
kind: concept
summary: "Compare ephemeral point-to-point message queues (RabbitMQ/SQS) with persistent partitioned append-only event logs (Kafka)."
tags: [messaging, kafka, rabbitmq, event-streaming]
related: [publish-subscribe-pattern, partitioned-logs-and-consumer-groups, delivery-semantics-and-deduplication]
---
> **In one line:** Message queues delete messages once acknowledged by a consumer; event logs retain an immutable, ordered stream that multiple consumers can replay independently.

## The idea
In distributed architectures, asynchronous communication decouples producers from consumers, smooths traffic spikes, and prevents cascading service failures. However, "asynchronous messaging" encompasses two fundamentally different paradigms: **Message Queues** and **Partitioned Event Logs**.

**Message Queues (RabbitMQ, AWS SQS):**
- *Model:* Point-to-point or publish-subscribe with ephemeral message lifecycle.
- *Mechanism:* A producer publishes a message. The broker routes it to a queue. A worker consumer pulls the message, processes it, and sends an acknowledgment (`ACK`). Upon receiving the ACK, **the broker immediately deletes the message from storage**.
- *Strengths:* Rich routing logic (topic exchanges, direct routing), per-message acknowledgments, dead-letter queues, and dynamic work distribution across competing consumers.
- *Limitations:* Destructive reads. Once consumed, messages cannot be re-read or replayed by another service.

**Partitioned Event Logs (Apache Kafka, Apache Pulsar):**
- *Model:* Append-only, distributed, persistent ordered commit logs.
- *Mechanism:* A producer appends an immutable event to a partition. Events are assigned a monotonically increasing integer called an **offset**. The log is persisted to disk and retained for a configured time window (e.g., 7 days) **regardless of whether it has been consumed**. Consumers maintain their own offset pointer and can read or replay historical events independently at their own pace.
- *Strengths:* Massive throughput (millions of events/sec via sequential disk I/O and zero-copy OS transfers), replayability, event sourcing, and stream processing.
- *Limitations:* Less flexible routing; consumers must process messages in sequential partition order.

## See it
Compare Message Queues and Event Logs across core capabilities:

| Feature Dimension | Message Queue (RabbitMQ / SQS) | Event Log (Apache Kafka / Pulsar) |
|---|---|---|
| **Data Retention** | Ephemeral (deleted immediately upon ACK) | Persistent (retained for days/years on disk) |
| **Replayability** | Impossible (destructive read) | Native (reset consumer offset to replay) |
| **Consumer Tracking** | Broker tracks which consumer has each message | Consumer tracks its own integer offset |
| **Throughput Ceiling** | Moderate (tens of thousands of msgs/sec) | Extreme (millions of events/sec via zero-copy) |
| **Ordering** | FIFO per queue, but concurrent consumers reorder | Strictly ordered within each individual partition |
| **Primary Use Cases** | Background tasks, job queues, transactional commands | Event sourcing, analytics clickstream, CDC logs |

```flow
p: Event Producer | Writes to end of log @primary
log: Kafka Partition Log | [0][1][2][3][4][5][6] @blue
c1: Analytics Consumer | Offset: 6 (Real-time) @green
c2: Billing Consumer | Offset: 2 (Replaying) @amber
p -> log: Append event at offset 7
log -> c1: Stream event 6
log -> c2: Stream event 2
```

```bash
# Consuming from Kafka and resetting offset to replay yesterday's events
kafka-consumer-groups.sh --bootstrap-server localhost:9092   --group analytics-pipeline   --topic user-clicks   --reset-offsets --to-offset 0   --execute
```

> **Tip:** Use a message queue (RabbitMQ/SQS) when you need individual task tracking, flexible routing, and immediate deletion. Use an event log (Kafka) when multiple independent services need to replay the same event stream or process high-throughput telemetry.

## Go deeper
Kafka achieves its extreme throughput by using the Linux kernel's `sendfile` system call (Zero-Copy). Data is transferred directly from the disk page cache to the network socket buffer without copying bytes into application user space, eliminating CPU memory copying overhead.
## Watch out
- Do not use Kafka as a simple task queue with individual per-message retry logic; retrying a single failed message in Kafka stalls the entire partition.
- Remember that message queues do not support replaying past events to rebuild a corrupted database.
## Remember
- Message queues delete messages upon acknowledgment; event logs retain persistent immutable streams.
- Event logs allow multiple consumers to replay historical events independently by manipulating offsets.
- Use queues for background jobs; use event logs for high-throughput streaming, CDC, and event sourcing.
