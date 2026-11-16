---
slug: the-saga-pattern
title: "The Saga Pattern"
topic: distributed-coordination
kind: pattern
summary: "Coordinate long-running distributed business transactions across microservices using compensating transactions."
tags: [sagas, distributed-transactions, microservices, event-driven]
related: [two-phase-commit, saga-orchestration-vs-choreography, transactional-outbox-pattern]
---
> **In one line:** A saga coordinates a distributed business transaction as a sequence of local transactions, undoing failures using compensating transactions.

## The idea
Because Two-Phase Commit (2PC) blocks and scales terribly across distributed microservices, modern architectures replace it with the **Saga Pattern** (first described by Hector Garcia-Molina and Kenneth Salem in 1987).

A **Saga** breaks a large, distributed business process into a sequential chain of **local transactions**:
1. Each local transaction updates the database of a single microservice and publishes an event or message triggering the next step in the saga.
2. If all local transactions succeed, the saga completes successfully.
3. If a local transaction fails midway (e.g., payment succeeds, but inventory reservation fails because the item is out of stock), the saga must execute **Compensating Transactions** in reverse order to undo the changes made by preceding steps!

**Compensating Transactions:**
In a single database, a rollback simply discards the transaction from memory or replays the undo log; the changes were never visible to other transactions. In a saga, local transactions have **already committed to their individual databases**. You cannot "un-commit" a committed database transaction. Instead, the system must execute an explicit forward-compensating business action:
- Local Transaction: Charge customer credit card $100.
- Compensating Transaction: Issue an explicit refund of $100 to the customer's credit card.
- Local Transaction: Reserve flight seat 12B.
- Compensating Transaction: Cancel reservation for seat 12B.

## See it
Trace the compensation flow in a travel booking saga when the hotel reservation fails:

```flow
start: User Initiates Trip Booking @neutral
t1: 1. Car Rental Service | Car Reserved (Committed) @green
t2: 2. Flight Service | Flight Booked (Committed) @green
t3: 3. Hotel Service | Out of Rooms! (FAILED) @red
c2: Compensate Flight | Cancel Flight Reservation @amber
c1: Compensate Car | Cancel Car Rental @amber
done: Trip Booking Aborted | Customer Notified @blue
start -> t1: Step 1: OK
t1 -> t2: Step 2: OK
t2 -> t3: Step 3: FAILED!
t3 -> c2: Trigger Compensation
c2 -> c1: Trigger Compensation
c1 -> done: Complete Rollback
```

```yaml
# Saga execution log representation
saga_instance:
  id: "saga_trip_88192"
  status: "COMPENSATED"
  completed_steps:
    - step: "reserve_car"
      status: "COMPENSATED"
      action_txn_id: "car_txn_481"
      compensating_txn_id: "car_refund_991"
    - step: "book_flight"
      status: "COMPENSATED"
      action_txn_id: "flight_seat_12B"
      compensating_txn_id: "flight_cancel_12B"
    - step: "reserve_hotel"
      status: "FAILED"
      error: "NO_VACANCY"
```

> **Note:** A compensating transaction can also fail due to network drops! Therefore, **compensating transactions must be idempotent and retried until they succeed**.

## Go deeper
**What Sagas Give Up: Isolation (The "I" in ACID).**
In a 2PC transaction, no outside user can see uncommitted intermediate states because rows remain locked. In a saga, because each local transaction commits immediately, **concurrent transactions can observe intermediate, uncompensated state!** For instance, a customer might see their bank balance drop by $100, and five seconds later see it refunded. Sagas must design semantic counter-measures (such as placing orders in a `PENDING` status) to handle this lack of isolation.
## Watch out
- Compensating transactions must be completely idempotent; network retries during compensation must never issue multiple refunds.
- Design application data models to account for the lack of isolation; use state machines (`PENDING`, `CONFIRMED`, `CANCELING`) for all entities involved in sagas.
## Remember
- A saga coordinates distributed workflows as a sequence of independent local transactions.
- Failures trigger compensating transactions in reverse order to semantically undo committed steps.
- Sagas sacrifice ACID isolation; intermediate states are visible to concurrent operations.
