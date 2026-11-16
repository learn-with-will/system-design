---
slug: idempotency-keys
title: "Idempotency Keys"
topic: distributed-reliability
kind: pattern
summary: "Make non-idempotent HTTP POST requests safely retryable using client-generated unique idempotency tokens."
tags: [idempotency, api-design, stripe, retries]
related: [the-two-generals-and-network-uncertainty, exponential-backoff-and-jitter, rest-and-resource-modeling]
---
> **In one line:** An idempotency key is a unique client-generated token that allows servers to detect and deduplicate retried POST requests, ensuring operations execute exactly once.

## The idea
In RESTful HTTP semantics, GET, PUT, and DELETE are naturally idempotent: executing them multiple times produces the identical server state. However, **POST** is non-idempotent. Submitting a `POST /api/v1/charges` three times results in three distinct charges on the customer's credit card.

Now consider the Two Generals network uncertainty:
1. A client submits a POST request to charge a credit card $50.
2. The payment gateway charges the card, but a network disconnect drops the HTTP response packet on the way back.
3. The client receives a connection timeout. The outcome is **Unknown**.
4. If the client retries the POST request, the user is double-charged! If the client does *not* retry, the user's order is never created.

The **Idempotency Key Pattern** (pioneered by Stripe) solves this dilemma cleanly:
- Before sending the POST request, the client generates a unique random token (typically a UUIDv4), called the **Idempotency Key**, and attaches it in an HTTP header: `Idempotency-Key: 7b8c-1a2d-4e9f`.
- When the server receives the request, it checks an atomic store (Redis or an `idempotency_keys` database table).
- **First Time Seen:** The server stores the key with status `IN_PROGRESS`, executes the payment, caches the final HTTP response payload and status code, and marks the status `COMPLETED`.
- **Subsequent Retry with Same Key:** The server detects the key already exists! It **bypasses all business logic** and immediately replays the exact cached response from the first execution.

The client can safely retry the operation ten times across network disconnects; the card is charged exactly once, and every retry receives the correct receipt.

## See it
Trace the server-side lifecycle of an idempotency key during a client retry:

```sequence
actor client: Mobile Client @neutral
actor gw: API Gateway @primary
actor store: Idempotency Store | Redis @blue
actor bank: Payment Gateway @green
client -> gw: POST /charges (Key: abc-123)
gw -> store: Check key "abc-123"
store --> gw: Key not found (Set IN_PROGRESS)
gw -> bank: Charge card $50
bank --> gw: Charge successful (ch_99)
gw -> store: Save response: 201 Created
gw --> client: 201 Created (ch_99)
client -> gw: Retry POST /charges (Key: abc-123)
gw -> store: Check key "abc-123"
store --> gw: Key COMPLETED (Return cached)
gw --> client: 201 Created | Replayed response
```

```http
// Client submitting payment with explicit Idempotency-Key header
POST /api/v1/charges HTTP/1.1
Host: api.stripe.com
Authorization: Bearer sk_live_secret123
Idempotency-Key: 7f8c1a2e-4b6d-4911-b0e7-8c4392a87b12
Content-Type: application/json

{
  "amount_cents": 5000,
  "currency": "usd",
  "customer": "cus_99182"
}
```

> **Tip:** Idempotency records should carry an expiration TTL (typically **24 hours**). This provides a generous window for network retries while preventing infinite storage growth.

## Go deeper
What happens if a retry arrives while the first request is still being processed (`IN_PROGRESS`)? The server must either hold the second connection until the first completes, or immediately return **HTTP 409 Conflict** with a header advising the client that the transaction is currently being processed.
## Watch out
- Clients must generate a *new* idempotency key if the request payload changes; submitting different payloads with the same key must return HTTP 422 Unprocessable Entity.
- Ensure the idempotency key lock is released if the initial database transaction fails before execution begins.
## Remember
- Idempotency keys allow non-idempotent operations (POST) to be safely retried across network drops.
- The server caches the final response against the key and replays it on subsequent retries.
- Store idempotency keys with a 24-hour TTL in Redis or a dedicated database table.
