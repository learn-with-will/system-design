---
id: lesson-19
slug: distributed-transactions
title: "Distributed Transactions: Saga, 2PC & Outbox"
level: advanced
order: 19
duration: 28
tags:
  - distributed-transactions
  - saga
  - two-phase-commit
  - outbox
  - consistency
---

# Learning Objectives

By the end of this lesson you will be able to:

- Explain why cross-service atomicity is hard once each service owns its data.
- Describe **two-phase commit (2PC)** and why it's blocking.
- Explain the **saga** pattern and the difference between **orchestration** and **choreography**.
- Explain what sagas give up (**isolation**) and how to cope.
- Use the **transactional outbox** to publish events reliably.

# Why It Matters

Inside one database, an **ACID transaction** makes "debit A, credit B" atomic — both happen
or neither does. But once you split into services that each own their data (Lesson 17), a
single business operation ("place order" = reserve inventory + charge payment + create
shipment) spans **multiple** databases, and you **can't** wrap them in one ACID transaction.
Getting these operations to complete-or-cleanly-undo is one of the defining challenges of
distributed systems.

# Concept Explanation

### Two-phase commit (2PC)

The textbook way to make a transaction atomic across nodes is **two-phase commit**, run by a
**coordinator**:

```text
  Phase 1 (prepare): coordinator -> all participants: "can you commit?"
                     each participant does the work, locks, votes YES/NO
  Phase 2 (commit):  if ALL voted YES -> "commit"; if ANY voted NO -> "abort"
```

It does provide atomicity — but it has serious costs:

- **It's blocking.** Between voting YES and hearing the decision, a participant holds locks
  and waits. If the **coordinator crashes** at that moment, participants are stuck
  **in-doubt** — locked and unable to proceed — until it recovers.
- **It hurts availability and scale.** It's synchronous, holds locks across the network, and
  a partition can stall it. It is **not partition-tolerant**.

Because of this, 2PC is used *inside* some databases (via XA) but is generally **avoided
across microservices** at scale.

### Sagas

The common alternative is the **saga**: model the distributed operation as a **sequence of
local transactions**, one per service. Each local step commits on its own; if a later step
fails, you run **compensating transactions** that semantically **undo** the earlier steps.

```text
  Order saga (happy path):
    1. reserve inventory   2. charge payment   3. create shipment
  If step 3 fails:
    compensate 2 (refund payment) -> compensate 1 (release inventory)
```

Sagas come in two coordination styles:

- **Choreography:** no central controller. Each service does its step and **emits an event**;
  the next service reacts to that event. Decentralized and loosely coupled, but the overall
  flow is spread across services and can be hard to follow or debug.
- **Orchestration:** a central **orchestrator** tells each service what to do next and
  triggers compensations on failure. Easier to understand and change (the flow lives in one
  place), at the cost of building and running the orchestrator.

### What sagas give up: isolation

This is the crucial caveat. A saga provides a form of **atomicity** (everything completes, or
compensations run), but it does **not** provide **isolation**. Because each step commits
immediately, the **intermediate state is visible** to other transactions before the saga
finishes — another operation might see inventory reserved but payment not yet taken, or read
a value that later gets compensated away. You manage this with application-level techniques
(semantic locks, status flags like "pending," re-reads), not by assuming the database
isolates you. In short: **2PC keeps isolation but blocks; sagas stay available but lose
isolation.**

### The dual-write problem and the transactional outbox

A subtle, extremely common bug: a service needs to **update its database** *and* **publish an
event** ("OrderPlaced") so other services react. These are **two different systems**, so you
can't write both atomically. If the DB commit succeeds but the publish fails (or vice
versa), the system is inconsistent — this is the **dual-write problem**.

The **transactional outbox** solves it. In the **same local database transaction** as the
business change, insert a row into an **outbox** table. A separate process (a poller or a
change-data-capture stream) reads unsent outbox rows and publishes them to the broker,
marking them sent.

```text
  BEGIN TXN
    update order status = PLACED
    insert into outbox (event = "OrderPlaced", ...)   -- same transaction!
  COMMIT
  -- later: a relay reads the outbox and publishes to the broker (at-least-once)
```

Because the business change and the outbox row commit **together**, the event is published
**if and only if** the transaction committed. Delivery is **at-least-once**, so consumers must
be **idempotent** (Lessons 14–15) — the outbox and idempotent consumers are a matched pair.

# Key Terminology

- **Distributed transaction** — an operation spanning multiple services/databases.
- **Two-phase commit (2PC)** — a coordinator-driven prepare-then-commit protocol; atomic but
  blocking.
- **In-doubt / blocking** — participants stuck holding locks when the 2PC coordinator fails.
- **Saga** — a sequence of local transactions with compensating transactions to undo on
  failure.
- **Compensating transaction** — an action that semantically undoes a completed step.
- **Choreography vs orchestration** — event-driven decentralized flow vs a central
  coordinator.
- **Dual-write problem** — updating a database and publishing an event can't be done
  atomically.
- **Transactional outbox** — writing an event to an outbox table in the same DB transaction,
  then relaying it.

# Options and Trade-offs

| Approach | Atomicity | Isolation | Availability | Notes |
| -------- | --------- | --------- | ------------ | ----- |
| 2PC | Yes | Yes | Low (blocking, not partition-tolerant) | Avoid across microservices |
| Saga (choreography) | Yes (via compensation) | No | High | Flow spread across services |
| Saga (orchestration) | Yes (via compensation) | No | High | Central, easier to follow |
| Outbox (for events) | Reliable publish | n/a | High | Needs idempotent consumers |

# Worked Example

An **order** operation must reserve inventory, charge payment, and create a shipment —
across three services. You can't use one ACID transaction. Use an **orchestrated saga**:

```text
  Orchestrator:
    step 1 -> Inventory.reserve()        ok
    step 2 -> Payment.charge()           ok
    step 3 -> Shipping.create()          FAILS
    compensate step 2 -> Payment.refund()
    compensate step 1 -> Inventory.release()
    mark order FAILED
```

Each step is a local transaction that commits immediately; the orchestrator drives the flow
and runs compensations in reverse on failure. To reliably tell downstream systems the
outcome, each service uses the **outbox pattern**: it writes its state change and an event in
one local transaction, and a relay publishes the event.

The trade-off you accept: **no isolation**. Between steps 1 and 3, the order is in a
**pending** state that other operations might observe (inventory reserved, shipment not yet
created). You handle that explicitly — e.g. mark the order `PENDING` and don't treat it as
complete anywhere until the saga finishes. This is the standard pattern for long-running,
cross-service business transactions.

# Real World Analogy

Booking a vacation across three companies — flight, hotel, car — is a saga. You book each
separately (local transactions). If the car rental falls through, you don't get one magic
"undo everything" button (that would be 2PC, and the agencies won't hold everything locked
while they wait on each other). Instead you **cancel** the hotel and **cancel** the flight —
**compensating transactions**. And in between, the world can *see* your half-finished trip
(the hotel shows booked before you cancel) — that's the **lost isolation**.

# Examples

## Example 1 — Basic: outbox for reliable events

A service marks an order paid and must notify shipping. It writes the status and an outbox
row in one transaction; a relay publishes "OrderPaid." Even if the service crashes right
after commit, the event is still in the outbox and gets published on restart.

**Why this works:** the DB change and the event commit atomically, so the event is never
lost and never sent for an uncommitted change.

## Example 2 — Real-world: choreographed saga

In an e-commerce flow, "OrderCreated" triggers the payment service; its "PaymentCompleted"
triggers shipping; a failure emits "PaymentFailed," which triggers inventory release. No
central coordinator — services react to each other's events.

**Why this works:** loose coupling and no single orchestrator; the trade-off is that the
end-to-end flow is spread across services and harder to trace.

## Example 3 — Trade-off / pitfall: reaching for 2PC across services

A team wires three microservices together with 2PC for a checkout. Under load, a coordinator
hiccup leaves participants in-doubt, holding locks; requests stall and the checkout stops.

**Why this bites:** 2PC blocks and isn't partition-tolerant, so it becomes an
availability liability at service scale. A saga (with compensations) keeps the system
available.

# Common Mistakes

- **Using 2PC across microservices.** Its blocking behavior wrecks availability at scale;
  prefer sagas.
- **Assuming sagas give isolation.** They don't — intermediate states are visible; handle it
  with pending states and semantic locks.
- **Dual writes** (DB then broker) without an outbox. A crash between them corrupts
  consistency; use the transactional outbox.
- **Non-idempotent saga steps or consumers.** Steps and compensations may run more than once;
  make them idempotent.
- **Forgetting to design compensations.** Every step that can be followed by a failure needs
  a way to be undone.

# Best Practices

- **Prefer sagas** for cross-service business transactions; use **orchestration** when you
  want the flow in one place, **choreography** for loose coupling.
- **Design a compensating action for every reversible step**, and make steps and
  compensations **idempotent**.
- **Model intermediate states explicitly** (e.g. `PENDING`) since sagas lack isolation.
- **Use the transactional outbox** to publish events reliably, paired with **idempotent
  consumers**.
- **Reserve 2PC** for within-database (XA) cases, not sprawling microservice calls.

# Summary

- Once services own their data, a business operation spans multiple databases and **can't**
  use one ACID transaction.
- **2PC** gives atomicity *and* isolation but is **blocking** and not partition-tolerant —
  avoid it across microservices.
- A **saga** is a sequence of local transactions with **compensating transactions**;
  **orchestration** centralizes the flow, **choreography** is event-driven. Sagas keep
  availability but **give up isolation**, so model intermediate states explicitly.
- The **dual-write problem** (DB + event not atomic) is solved by the **transactional
  outbox**, paired with **idempotent consumers**.

# Flash Cards

Q: Why is two-phase commit (2PC) problematic across microservices?
A: It's blocking — participants hold locks while waiting, and a coordinator crash can leave them in-doubt — and it isn't partition-tolerant, so it harms availability and scale.

Q: What is a saga?
A: A distributed transaction modeled as a sequence of local transactions, where a failure triggers compensating transactions that semantically undo the earlier completed steps.

Q: What is the difference between saga orchestration and choreography?
A: Orchestration uses a central coordinator that tells each service what to do next; choreography has each service emit events that trigger the next, with no central controller.

Q: What guarantee do sagas give up compared to a single ACID transaction?
A: Isolation. Each step commits immediately, so intermediate states are visible to other operations before the saga completes.

Q: What is the dual-write problem, and how does the outbox solve it?
A: Updating a database and publishing an event are two systems that can't be written atomically, so one may succeed and the other fail. The transactional outbox writes the event to an outbox table in the same DB transaction, and a relay publishes it — so the event is sent if and only if the transaction committed.

Q: Why must consumers of outbox-published events be idempotent?
A: Because the relay publishes at-least-once, so an event may be delivered more than once; idempotent consumers make duplicates harmless.

# Exercises

### Easy
List the steps of a saga for "book a trip" (flight, hotel, car) and the compensating action
for each step if a later one fails.

### Medium
Explain why a saga does not provide isolation, and describe one concrete problem another
operation could observe mid-saga plus how you'd mitigate it.

### Challenging
Design the "place order" flow across inventory, payment, and shipping services. Choose
orchestration or choreography and justify it, define each step and its compensation, and show
how you'd publish the "OrderPlaced" event reliably without a dual-write bug.

# Further Reading

- Chris Richardson, microservices.io — "Pattern: Saga," "Pattern: Transactional outbox,"
  and "Pattern: Orchestration/Choreography": https://microservices.io/patterns/
- Martin Kleppmann, *Designing Data-Intensive Applications*, Chapter 9 (atomic commit and
  two-phase commit).
