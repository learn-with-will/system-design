---
id: lesson-14
slug: messaging-and-event-streaming
title: "Messaging & Event Streaming"
level: intermediate
order: 14
duration: 28
tags:
  - messaging
  - queues
  - kafka
  - delivery-semantics
  - backpressure
---

# Learning Objectives

By the end of this lesson you will be able to:

- Explain why **asynchronous messaging** decouples producers from consumers.
- Tell a **message queue** apart from an **event log/stream**.
- Compare the delivery semantics: **at-most-once**, **at-least-once**, **exactly-once**.
- Explain why true **exactly-once delivery** is generally impossible, and what systems really provide.
- Describe **backpressure** and how systems cope when consumers fall behind.

# Why It Matters

Not everything should happen inside the user's request. When someone uploads a video, you
don't make them wait while it's transcoded — you accept it, drop a message on a queue, and
process it in the background. **Asynchronous messaging** is how systems decouple work,
absorb traffic spikes, and stay responsive. It's also where a subtle, frequently-botched
topic lives: delivery guarantees.

# Concept Explanation

### Why go asynchronous

In **synchronous** communication, the caller waits for the callee to finish. In
**asynchronous** messaging, the producer hands off a **message** and moves on; a consumer
processes it later. This buys you:

- **Decoupling** — producer and consumer don't need to be up at the same time or run at
  the same speed.
- **Buffering** — a spike of work piles up in the broker instead of overwhelming the
  consumer.
- **Resilience** — if a consumer is down, messages wait rather than being lost.
- **Fan-out** — one event can feed many independent consumers.

```text
   Producer --> [ Broker / queue or log ] --> Consumer(s)
   (accepts fast)      (buffers)               (process at their own pace)
```

### Queues vs logs

Two different models, often confused:

| | Message queue | Event log / stream |
| --- | ------------- | ------------------ |
| Example | RabbitMQ, Amazon SQS | Apache Kafka |
| On consume | Message is **removed** | Message **stays**; consumer tracks an **offset** |
| Consumers | Compete; each message handled once by the group | Many independent readers, each at its own offset |
| Replay | Generally no (it's gone) | Yes — rewind the offset and re-read |
| Ordering | Limited | Ordered **within a partition** |
| Fits | Distributing tasks to workers | Event streams many services consume/replay |

A **queue** is like a to-do list workers pull tasks from — once done, the task is gone. A
**log** (Kafka's model) is an **append-only, ordered record** that isn't deleted when read;
each consumer remembers its **offset** (position), so different consumers read the same
events independently and can **replay** history. Kafka partitions a topic for scale and
guarantees order **within** a partition (not across).

### Delivery semantics

When a broker delivers a message, how hard does it try, and what can go wrong?

- **At-most-once:** deliver and don't worry about failures. Simple and fast, but messages
  can be **lost**. Fine for disposable data (e.g. some metrics).
- **At-least-once:** keep trying until the consumer acknowledges. Nothing is lost, but a
  lost *acknowledgment* causes **duplicates** — the same message may arrive more than once.
  This is the common default.
- **Exactly-once:** every message takes effect once — no loss, no duplicates. The ideal —
  and the hard one.

### The truth about "exactly-once"

Here's the fact that's constantly overstated: **exactly-once *delivery* is generally
impossible** in a distributed system, because a sender that doesn't receive an
acknowledgment can't tell whether the message was lost or the *ack* was lost — so it must
either risk losing it (at-most-once) or risk a duplicate (at-least-once).

What real systems provide instead is **exactly-once *processing***: use **at-least-once**
delivery and make the consumer **idempotent** (or deduplicate by message id), so
processing a duplicate has no extra effect. The combination is often called
"effectively-once."

> Kafka offers "exactly-once semantics," but that guarantee holds **within Kafka** (via an
> idempotent producer and transactions across Kafka topics). End-to-end exactly-once to an
> external system (a database, an email) still requires an **idempotent sink** — the next
> lesson's topic. Never claim the network itself delivers exactly once.

### Backpressure

If producers push faster than consumers can handle, the backlog grows. **Backpressure** is
the set of mechanisms for coping: the broker buffers (up to a limit), consumers scale out
to drain faster, or the system slows/rejects producers. An **unbounded** queue is a trap —
it hides the problem until you run out of memory or the lag becomes hours. Monitor
**consumer lag** and cap queue growth.

# Key Terminology

- **Message broker** — the middleware that stores and delivers messages (queue or log).
- **Producer / consumer** — who sends messages / who processes them.
- **Message queue** — messages are removed once consumed; workers compete for them.
- **Event log / stream** — append-only, retained, ordered; consumers track offsets and can
  replay.
- **Offset** — a consumer's position in a log.
- **At-most-once / at-least-once / exactly-once** — delivery guarantees.
- **Idempotent consumer** — processing a duplicate has no additional effect.
- **Backpressure** — coping when consumers can't keep up with producers.
- **Consumer lag** — how far behind the consumers are from the latest messages.

# Options and Trade-offs

| Guarantee | Behavior | Cost | Use when |
| --------- | -------- | ---- | -------- |
| At-most-once | May lose messages | Cheapest, simplest | Loss is acceptable (some metrics) |
| At-least-once | May duplicate | Needs idempotent/dedup consumers | The common default |
| Exactly-once (processing) | Effectively once | Idempotency + coordination overhead | Money, inventory, anything that must not double |

# Worked Example

An e-commerce checkout must send an order-confirmation email and update inventory. Doing
both inside the request makes checkout slow and fragile (if the email service is down,
checkout fails). Move them onto a **log**:

```text
  Checkout --> append "OrderPlaced" event --> [ Kafka topic: orders ]
                                                 |          |
                                    +------------+          +-----------+
                                    v                                   v
                          [ Email service ]                   [ Inventory service ]
                          (its own offset)                    (its own offset)
```

Both services consume the same `OrderPlaced` events **independently** at their own offset —
and a new "analytics" consumer can be added later to replay history, without touching
checkout. Delivery is **at-least-once**, so the email service might receive an
`OrderPlaced` twice (e.g. after a crash-and-restart). To avoid two emails, it **dedupes**
by `orderId`: "already emailed order 8a3f? skip." That's exactly-once *processing* built on
at-least-once delivery — the standard, honest pattern.

# Real World Analogy

A message queue is a **deli ticket line**: each customer (message) is served once by
whichever clerk is free, and the ticket is thrown away after. An event log is the
**newspaper**: it's printed once in order, everyone can read the same edition, latecomers
can read back issues, and reading it doesn't consume it. "At-least-once" is a courier who
re-delivers if unsure you got the parcel — occasionally you get two, so you check the
tracking number (dedup) before acting.

# Examples

## Example 1 — Basic: buffering a traffic spike

A flash sale sends 50,000 orders in a minute; the fulfillment system handles 500/second.
A queue absorbs the burst, and workers drain it over the next few minutes instead of the
system collapsing.

**Why this works:** the broker buffers the spike, decoupling the fast producer from the
slower consumer.

## Example 2 — Real-world: fan-out with a log

One `UserSignedUp` event feeds the welcome-email service, the analytics pipeline, and the
recommendation warmer — three independent consumers reading the same log at their own
offsets.

**Why this works:** a retained, replayable log lets many consumers react to one event, and
new consumers can be added without changing the producer.

## Example 3 — Trade-off / pitfall: assuming exactly-once delivery

A team builds a payment charger on "exactly-once" delivery and skips dedup. A redelivered
message double-charges a customer.

**Why this bites:** exactly-once *delivery* isn't guaranteed end-to-end. The fix is an
idempotent consumer (dedup by a payment id) so a duplicate delivery has no extra effect.

# Common Mistakes

- **Assuming exactly-once delivery.** Design for at-least-once and make consumers
  idempotent.
- **Non-idempotent consumers.** Under at-least-once, a duplicate must be safe to process
  again.
- **Unbounded queues.** They hide overload until you run out of memory; cap them and watch
  consumer lag.
- **Confusing queues and logs.** If you need replay or many independent consumers, you want
  a log, not a delete-on-read queue.
- **Assuming global ordering.** Kafka orders **within a partition**, not across the whole
  topic.

# Best Practices

- **Use async messaging** to decouple slow or optional work from the request path.
- **Default to at-least-once + idempotent consumers** ("effectively-once").
- **Choose a log** when you need replay, ordering within a partition, or many independent
  consumers; a **queue** for simple task distribution.
- **Bound your queues** and **monitor consumer lag** as a health signal.
- **Design for redelivery**: dedup by a stable message/business id.

# Summary

- **Asynchronous messaging** decouples producers and consumers, buffers spikes, and enables
  fan-out.
- A **queue** removes messages on consume (workers compete); a **log** (Kafka) retains
  ordered messages that many consumers read via **offsets** and can **replay**.
- Delivery is **at-most-once** (may lose), **at-least-once** (may duplicate), or
  **exactly-once** (ideal).
- **Exactly-once *delivery* is generally impossible**; systems provide exactly-once
  *processing* via **at-least-once + idempotent/dedup consumers** (Kafka's exactly-once
  holds within Kafka).
- Watch **backpressure** and **consumer lag**; never rely on unbounded queues.

# Flash Cards

Q: What is the key difference between a message queue and an event log?
A: A queue removes each message once it's consumed (workers compete for it); an event log retains ordered messages so many consumers can read independently by offset and replay history.

Q: What are the three delivery semantics?
A: At-most-once (may lose messages), at-least-once (may deliver duplicates), and exactly-once (no loss, no duplicates — the hard one).

Q: Why is true exactly-once delivery generally impossible?
A: Because a sender that gets no acknowledgment can't tell whether the message or the ack was lost, so it must risk either loss (at-most-once) or duplication (at-least-once).

Q: How do systems achieve exactly-once processing in practice?
A: With at-least-once delivery plus an idempotent consumer (or deduplication by message id), so processing a duplicate has no additional effect — "effectively once."

Q: Does Kafka's exactly-once apply end-to-end to any external system?
A: No — it holds within Kafka (idempotent producer + transactions across Kafka topics). Writing to an external database or service still needs an idempotent sink.

Q: What is backpressure, and why avoid unbounded queues?
A: Backpressure is coping when consumers can't keep up (buffer, scale out, or slow producers). Unbounded queues hide overload until you run out of memory or lag grows huge, so cap them and monitor consumer lag.

# Exercises

### Easy
For each, choose a queue or a log and justify it: (a) sending password-reset emails to a
pool of workers, (b) an event stream several teams want to consume and replay, (c) resizing
uploaded images.

### Medium
Your order-processing consumer uses at-least-once delivery. Describe exactly how you'd make
it safe against duplicate deliveries so a customer is never charged twice. What identifier
do you dedupe on, and where do you store it?

### Challenging
A downstream consumer is falling behind during peak hours, and lag is growing. Walk through
your options (scale consumers, partition the topic, shed or slow producers, bound the
queue). What do you monitor to know it's healthy again, and what's the risk of just making
the queue bigger?

# Further Reading

- Martin Kleppmann, *Designing Data-Intensive Applications*, Chapter 11 ("Stream
  Processing").
- Apache Kafka documentation — https://kafka.apache.org/documentation/ (the log model,
  offsets, partitions, and delivery/exactly-once semantics).
