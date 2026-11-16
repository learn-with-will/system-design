---
slug: saga-orchestration-vs-choreography
title: "Saga Orchestration vs Choreography"
topic: distributed-coordination
kind: technique
summary: "Compare decentralized event-driven Choreography with centralized state-machine Orchestration for sagas."
tags: [sagas, orchestration, choreography, microservices]
related: [the-saga-pattern, transactional-outbox-pattern, publish-subscribe-pattern]
---
> **In one line:** Choreography coordinates sagas through decentralized event pub/sub; Orchestration coordinates sagas through a central stateful orchestrator service.

## The idea
When implementing the Saga Pattern across microservices, system designers must decide how the individual steps and compensating transactions are coordinated. There are two primary architectural styles: **Choreography** and **Orchestration**.

**1. Choreography (Decentralized Event-Driven):**
There is no central coordinator. Services listen to events published by other services and decide independently what to do:
- Order Service creates an order in `PENDING` state and publishes `OrderCreated`.
- Payment Service listens to `OrderCreated`, charges the customer's credit card, and publishes `PaymentAuthorized`.
- Inventory Service listens to `PaymentAuthorized`, reserves items, and publishes `InventoryReserved`.
- If Payment fails, it publishes `PaymentFailed`. The Order Service listens to `PaymentFailed` and cancels the order.
- *Pros:* Simple for small workflows (2–4 steps); no central point of control; completely loose coupling.
- *Cons:* "Spaghetti choreography." For complex workflows with 10+ steps, understanding the global business flow is nearly impossible. Tracking which service listens to what event requires distributed tracing across the entire codebase, and cyclic dependency deadlocks can emerge.

**2. Orchestration (Centralized State Machine):**
A dedicated service—the **Saga Orchestrator** (often implemented using workflow engines like Temporal, AWS Step Functions, or Camunda)—acts as the master conductor:
- The orchestrator maintains a persistent state machine for each saga instance.
- It explicitly sends commands to services: *"PaymentService, charge $100."*
- When Payment Service replies *"Done"*, the orchestrator sends the next command: *"InventoryService, reserve SKU-99."*
- If a step fails, the orchestrator explicitly commands compensating steps in reverse order.
- *Pros:* Clear visibility of the entire workflow; centralized error handling and timeout management; state machine can be visualized in dashboards.
- *Cons:* Risk of centralizing too much business logic in the orchestrator, turning microservices into "dumb" data executors.

## See it
Compare the communication topologies of Choreography and Orchestration:

```sequence
actor orch: Saga Orchestrator | State Machine @primary
actor pay: Payment Service | Charges card @blue
actor inv: Inventory Service | Reserves stock @green
orch -> pay: Command: Execute Payment
pay --> orch: Reply: Payment Authorized
orch -> inv: Command: Reserve Stock
inv --> orch: Reply: Stock Reserved
```

```yaml
# AWS Step Functions / Temporal Orchestrator State Machine Definition
OrderFulfillmentSaga:
  StartAt: ProcessPayment
  States:
    ProcessPayment:
      Type: Task
      Resource: "arn:aws:lambda:us-east-1:payment_lambda"
      Catch:
        - ErrorEquals: ["PaymentDeclined"]
          Next: CancelOrder
      Next: ReserveInventory
    ReserveInventory:
      Type: Task
      Resource: "arn:aws:lambda:us-east-1:inventory_lambda"
      Catch:
        - ErrorEquals: ["OutOfStock"]
          Next: RefundPayment
      Next: DispatchShipping
    RefundPayment:
      Type: Task
      Resource: "arn:aws:lambda:us-east-1:refund_lambda"
      Next: CancelOrder
    CancelOrder:
      Type: Fail
```

> **Tip:** Use Choreography for simple, 2-to-3-step linear workflows. Move to Orchestration as soon as a workflow involves more than four services, branching conditional logic, or complex compensation rollbacks.

## Go deeper
Modern workflow orchestrators (like Temporal and Cadence) solve the problem of orchestrator state persistence by using **Event Sourcing**. The orchestrator's execution history is persisted as an append-only event stream; if the orchestrator server crashes, a new instance replays the event history to resume execution at the exact pending step.
## Watch out
- In choreography, beware of cyclic event storms where Service A publishes an event that triggers Service B, which re-triggers Service A in an infinite loop.
- Ensure the orchestrator maintains its own persistent transactional database so it survives crashes mid-workflow.
## Remember
- Choreography coordinates workflows through decentralized pub/sub events; Orchestration coordinates via a central state machine.
- Choreography is simple for small flows but becomes unmanageable as complexity increases.
- Orchestration centralizes workflow visibility, error recovery, and timeout management.
