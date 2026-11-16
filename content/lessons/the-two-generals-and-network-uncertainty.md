---
slug: the-two-generals-and-network-uncertainty
title: "The Two Generals & Network Uncertainty"
topic: distributed-reliability
kind: concept
summary: "Understand the fundamental three states of distributed calls (Success, Fail, Unknown) and proof of consensus impossibility."
tags: [distributed-systems, network-uncertainty, two-generals, reliability]
related: [timeout-strategies, exponential-backoff-and-jitter, idempotency-keys]
---
> **In one line:** In distributed networks, when a request times out without a response, the outcome is fundamentally unknown: the operation may have succeeded, failed, or stalled in flight.

## The idea
On a single computer, invoking a local function has a deterministic outcome: the function executes and returns a result, or it throws an unhandled exception. The caller knows with certainty whether the operation succeeded or failed.

In a distributed system, network communication breaks this certainty. The classic **Two Generals Problem** illustrates why:
Two allied generals on opposite hills want to coordinate a simultaneous attack on a valley city. If both attack together, they win; if only one attacks, they are wiped out. They can only communicate via messengers who must cross the hostile valley, where they might be captured.
- General 1 sends a messenger: *"Attack tomorrow at 9 AM. Please acknowledge."*
- The messenger arrives. General 2 sends a reply: *"Acknowledged. I will attack at 9 AM."*
- Now General 2 faces a dilemma: did the messenger carrying the acknowledgment reach General 1? If not, General 1 won't attack, and General 2 will be slaughtered. So General 2 needs an acknowledgment of the acknowledgment!
- This chain of acknowledgments continues infinitely. Computer scientists proved that **two entities can never achieve 100% mutual consensus over an unreliable communications link**.

In distributed systems, this means every network call has **three possible states**, not two:
1. **Success:** The request succeeded and confirmation was received.
2. **Failure:** A definitive error response was received (e.g., HTTP 400 Bad Request).
3. **Unknown:** The call timed out with no response. The request may have been dropped before reaching the server, the server may have processed it and crashed before replying, or the response packet was dropped on the way back!

## See it
Trace the three network states during an unacknowledged timeout:

```sequence
actor client: Client Service @primary
actor net: Unreliable Network @amber
actor server: Payment Gateway @blue
client -> net: POST /charge ($500)
net -> server: Packet delivered!
note server: Credit card charged
server -> net: HTTP 200 OK
note net: Packet dropped in transit! @red
note client: Timeout after 5s: State is UNKNOWN! @amber
```

```yaml
# The Three States of Distributed RPC
rpc_outcomes:
  state_success:
    received: "HTTP 200 OK"
    knowledge: "Operation succeeded on remote server"
  state_failure:
    received: "HTTP 404 / 400 / 403"
    knowledge: "Operation failed cleanly on remote server"
  state_unknown:
    received: "Connection Timeout / Socket Hangup"
    knowledge: "UNKNOWN! Server may have charged card or never saw request!"
```

> **Note:** If the client naively retries an operation in the **Unknown** state, it risks charging the customer's credit card twice! This is why retries must always be paired with idempotency keys.

## Go deeper
The Fischer-Lynch-Paterson (FLP) impossibility result extended this concept to asynchronous distributed systems: no deterministic consensus protocol can guarantee both safety and liveness in an asynchronous network if even a single node is subject to unannounced crashes. Real-world consensus protocols (Raft, Paxos) sidestep FLP by introducing randomized timeouts or partial synchrony assumptions.
## Watch out
- Never treat a network timeout as confirmation that an operation failed; the remote server may have executed it successfully.
- Do not blindly retry non-idempotent operations after a timeout without an idempotency key.
## Remember
- The Two Generals Problem proves 100% certainty is impossible over unreliable networks.
- Distributed network calls produce three states: Success, Failure, and fundamentally Unknown.
- Because the outcome of a timeout is unknown, retries must always be idempotent.
