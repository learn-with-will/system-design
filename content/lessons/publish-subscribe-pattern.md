---
slug: publish-subscribe-pattern
title: "The Publish-Subscribe Pattern"
topic: asynchronous-systems
kind: pattern
summary: "Decouple producers from consumers using topics, message fan-out, and asynchronous event buses."
tags: [pub-sub, event-driven, messaging, architecture]
related: [message-queues-vs-event-logs, partitioned-logs-and-consumer-groups, transactional-outbox-pattern]
---
> **In one line:** Publish-Subscribe broadcasts messages to a topic so multiple independent subscriber services can consume the same event without coupling.

## The idea
In traditional point-to-point architectures, when a user completes an order, the Order Service must synchronously call the Payment Service, Inventory Service, Email Notification Service, and Analytics Service. This tight coupling creates severe problems:
1. If the Email Service is down, the entire checkout fails.
2. Adding a new Fraud Detection service requires modifying and redeploying the Order Service codebase.
3. The total checkout latency equals the sum of all downstream synchronous service calls.

The **Publish-Subscribe (Pub/Sub)** pattern decouples message senders (**publishers**) from message receivers (**subscribers**):
- Publishers do not know who the subscribers are, how many exist, or what they will do with the data. They simply publish an event (e.g., `OrderPlaced`) to a named **topic** or message channel.
- The messaging broker manages **fan-out**: distributing a copy of the event to every subscriber registered for that topic.
- Subscribers consume and process events independently and asynchronously at their own rate.

Pub/Sub provides **backpressure buffer management**: if the email service is overwhelmed during holiday traffic, incoming events accumulate safely in the broker without crashing the email worker or stalling the checkout pipeline.

## See it
Consider how Pub/Sub eliminates point-to-point coupling in an e-commerce platform:

```flow
pub: Order Service (Publisher) | Publishes OrderPlaced @primary
topic: Topic: "orders.placed" | Event broker fan-out @blue
sub1: Inventory Service | Updates warehouse stock @green
sub2: Email Service | Dispatches receipt @green
sub3: Fraud Detection | Evaluates risk score @green
sub4: Analytics Service | Data lake ingestion @green
pub -> topic: Publish event
topic -> sub1: Fan-out copy
topic -> sub2: Fan-out copy
topic -> sub3: Fan-out copy
topic -> sub4: Fan-out copy
```

```json
// Canonical domain event published to "orders.placed" topic
{
  "event_id": "evt_4812a",
  "event_type": "OrderPlaced",
  "occurred_at": "2026-11-16T20:15:00Z",
  "payload": {
    "order_id": "ord_9941",
    "user_id": "usr_882",
    "total_cents": 14999,
    "items": [{ "sku": "KEYBOARD-RGB", "qty": 1 }]
  }
}
```

> **Tip:** Domain events should be named in the past tense (`OrderPlaced`, `PaymentProcessed`, `AccountCreated`) to signify that they represent immutable historical facts that have already occurred.

## Go deeper
Brokers support two primary subscription filtering styles: **Topic-based** (subscribers listen to wildcards like `orders.us.*` or `orders.eu.*`) and **Content-based** (the broker inspects JSON attributes, routing events only to subscribers where `payload.total_cents > 10000`).
## Watch out
- Do not use Pub/Sub when synchronous request-response is required by the user interface (e.g., user password verification during login).
- Ensure event schemas are versioned (e.g., Avro or Protobuf with schema registries) to avoid breaking downstream subscribers when adding fields.
## Remember
- Pub/Sub decouples publishers from subscribers via named topics and fan-out message routing.
- Adding new consumer services requires zero code changes or deployments in the publishing service.
- Message brokers provide a buffer that isolates services from downstream latency and temporary outages.
