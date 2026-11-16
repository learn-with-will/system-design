---
slug: transactional-outbox-pattern
title: "The Transactional Outbox Pattern"
topic: distributed-coordination
kind: pattern
summary: "Solve the Dual-Write Problem by atomically committing domain changes and event records in the same database transaction."
tags: [outbox-pattern, dual-write, cdc, event-driven, kafka]
related: [publish-subscribe-pattern, the-saga-pattern, relational-databases-and-acid]
---
> **In one line:** The Transactional Outbox pattern guarantees reliable event publishing by saving domain updates and outbound events in the same atomic database transaction.

## The idea
A frequent requirement in event-driven microservices is updating an internal database *and* publishing a notification event to a message broker (like Kafka or RabbitMQ). For example, when an order is created, the service must:
1. `INSERT INTO orders ...` in PostgreSQL.
2. Publish an `OrderPlaced` event to Kafka.

This introduces the notorious **Dual-Write Problem**: two distinct storage systems cannot be updated atomically without slow, blocking two-phase commit.
- If you write to the database first and then publish to Kafka: your application might crash or lose network connectivity right before publishing to Kafka. The order exists in the database, but downstream services (inventory, shipping) never receive the event!
- If you publish to Kafka first and then write to the database: the database write might fail due to a constraint violation or lock timeout. The event has already been published to Kafka, but the order does not exist in the database!

**The Transactional Outbox Pattern** solves this dilemma elegantly by leveraging your database's native local ACID transactions:
1. Alongside your business tables, create an **`outbox` table** in the same database.
2. When business logic executes, the application inserts the domain entity into `orders` AND inserts an event record into `outbox` **within the exact same local database transaction**:
   `BEGIN; INSERT INTO orders ...; INSERT INTO outbox ...; COMMIT;`
3. A separate background process—a **Message Relay** or **Change Data Capture (CDC)** engine like Debezium—reads the `outbox` table and publishes events to Kafka. Once confirmed by Kafka, the relay deletes or marks the outbox record as published.

## See it
Trace the atomic commit and asynchronous relay in the Transactional Outbox pattern:

```flow
app: Application Service @primary
db: PostgreSQL DB (Atomic Transaction) @green
relay: Debezium / CDC Relay @blue
kafka: Apache Kafka Topic @blue
app -> db: BEGIN; INSERT orders; INSERT outbox; COMMIT;
relay -> db: Read outbox stream from WAL
relay -> kafka: Publish OrderPlaced event
```

```sql
-- Atomic domain update and outbox insertion in PostgreSQL
BEGIN;

-- 1. Insert domain order record
INSERT INTO orders (id, user_id, total_cents, status)
VALUES ('ord_9941', 'usr_482', 14999, 'CONFIRMED');

-- 2. Atomically insert event into outbox table in the SAME transaction
INSERT INTO outbox (id, aggregate_type, aggregate_id, event_type, payload)
VALUES (
  gen_random_uuid(),
  'Order',
  'ord_9941',
  'OrderPlaced',
  '{"orderId":"ord_9941","userId":"usr_482","totalCents":14999}'::jsonb
);

COMMIT;
```

```yaml
# Debezium PostgreSQL CDC Connector configuration
connector_config:
  connector.class: "io.debezium.connector.postgresql.PostgresConnector"
  database.hostname: "postgres.internal"
  table.include.list: "public.outbox"
  tombstones.on.delete: "false"
  plugin.name: "pgoutput" # Reads Postgres Write-Ahead Log directly!
```

> **Tip:** Modern architectures use **Change Data Capture (CDC)** via Debezium instead of polling queries (`SELECT * FROM outbox WHERE status = 'PENDING'`). CDC reads the PostgreSQL Write-Ahead Log directly, imposing near-zero CPU overhead on the database.

## Go deeper
Because the message relay can crash after publishing to Kafka but before marking the outbox row as processed, the relay may re-publish the event upon reboot. Therefore, the Transactional Outbox provides **at-least-once publishing**. Downstream consumers must implement idempotent deduplication!
## Watch out
- Do not poll the outbox table with high-frequency queries (`SELECT ... FOR UPDATE`) in high-throughput databases; table lock contention will degrade performance. Use CDC streaming.
- Ensure an automated purge job cleans up processed outbox rows to prevent the table from growing to millions of dead records.
## Remember
- The Dual-Write Problem occurs when attempting to update a database and message queue non-atomically.
- Transactional Outbox atomically saves domain data and event records in the same local database transaction.
- A CDC relay streams outbox events to the message broker, guaranteeing at-least-once event delivery.
