---
slug: delivery-semantics-and-deduplication
title: "Delivery Semantics & Deduplication"
topic: asynchronous-systems
kind: concept
summary: "Why network realities force at-least-once delivery, and how idempotency achieves effectively-once processing."
tags: [messaging, delivery-semantics, idempotency, deduplication]
related: [message-queues-vs-event-logs, partitioned-logs-and-consumer-groups, idempotency-keys]
---
> **In one line:** True exactly-once network delivery is impossible across distributed boundaries; real systems achieve effectively-once processing via at-least-once delivery and deduplication.

## The idea
In distributed messaging systems, network connections can drop at any moment: after a producer transmits an event, before a broker confirms receipt, or after a consumer processes a message but before its acknowledgment reaches the broker.

Because the outcome of dropped connections is fundamentally unknown, messaging brokers provide three distinct delivery guarantees:

1. **At-Most-Once:** The broker sends the message once. If a network blip occurs or the consumer crashes mid-processing, the message is lost forever. Messages are never duplicated, but data loss is common.
2. **At-Least-Once:** The broker retransmits messages until an acknowledgment is received. Messages are guaranteed never to be lost, but network retries can deliver **duplicate messages** to consumers.
3. **"Exactly-Once":** The myth of distributed systems. In an unreliable network with independent node crashes, **guaranteeing that a packet physically crosses the wire exactly once is mathematically impossible**.

What real systems actually provide is **Effectively-Once Processing**. The messaging pipeline uses at-least-once delivery, and the consumer implements **idempotent handling** or **message deduplication**:
- Every message carries a globally unique message ID (UUID).
- When a consumer receives a message, it checks a deduplication store (Redis or database unique constraint).
- If the ID has already been processed, the duplicate is safely discarded without re-executing business logic.

## See it
Compare the three messaging delivery semantics:

| Delivery Semantics | Data Loss Possible? | Duplicate Messages Possible? | Implementation Cost |
|---|---|---|---|
| **At-Most-Once** | **Yes** (dropped on failure) | No | Minimal (fire and forget) |
| **At-Least-Once** | No (retransmits on timeout) | **Yes** (duplicates on network ACK loss) | Standard industry default |
| **Effectively-Once** | No | No (duplicates filtered by consumer) | Requires idempotency / dedup store |

```sql
-- Deduplication table in PostgreSQL ensuring effectively-once processing
CREATE TABLE processed_events (
  event_id UUID PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Consumer atomic transaction: inserts dedup key and executes business update
BEGIN;
  -- If event_id already exists, primary key constraint aborts duplicate!
  INSERT INTO processed_events (event_id) VALUES ('8a1b-4c2d-9e3f');
  
  -- Business logic executes only if event_id is net-new
  UPDATE user_balances SET balance = balance + 50 WHERE user_id = 'usr_99';
COMMIT;
```

> **Tip:** In Apache Kafka, "Exactly-Once Semantics" (EOS) applies strictly *within* the Kafka ecosystem (via idempotent producers and transactional commits across Kafka topics). Once an event leaves Kafka to write to a database or trigger an external Stripe payment, application-level idempotency is required.

## Go deeper
The classic "Two Generals Problem" from computer science proves that two entities communicating over an unreliable channel can never reach 100% certainty that their acknowledgment was received. This mathematical reality is why distributed engineering focuses on idempotent recovery rather than impossible transport guarantees.
## Watch out
- Never claim a distributed architecture has "exactly-once delivery"; an interviewer will immediately test your understanding of network failure modes.
- Always implement idempotent consumer handlers when working with message brokers like Kafka, SQS, or RabbitMQ.
## Remember
- At-least-once delivery guarantees zero message loss but introduces duplicates.
- True exactly-once network delivery is mathematically impossible across distributed boundaries.
- Effectively-once processing is achieved by combining at-least-once delivery with consumer deduplication.
