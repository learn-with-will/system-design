---
id: lesson-15
slug: idempotency-retries-and-timeouts
title: "Reliable Communication: Idempotency, Retries & Timeouts"
level: intermediate
order: 15
duration: 26
tags:
  - idempotency
  - retries
  - timeouts
  - backoff
  - reliability
---

# Learning Objectives

By the end of this lesson you will be able to:

- Explain why a network **timeout** leaves an operation's outcome **unknown**.
- Choose sensible **timeout** values and explain the cost of getting them wrong.
- Use **retries** safely with **exponential backoff and jitter**.
- Explain **idempotency** and how **idempotency keys** make writes retry-safe.
- Recognize and prevent **retry storms**.

# Why It Matters

Every call between services can be lost, delayed, or arrive with no response. The naive
reactions — "just retry" or "wait forever" — cause double charges, cascading outages, and
mysterious data corruption. Reliable communication is a small set of disciplines —
timeouts, backoff, jitter, and idempotency — that turn an unreliable network into
dependable behavior. This lesson ties together the idempotency (Lesson 5) and delivery
(Lesson 14) threads.

# Concept Explanation

### The fundamental problem: the unknown outcome

When you send a request and don't get a response, you are stuck with genuine
**uncertainty**: did the operation succeed and the *response* get lost, or did the request
itself never arrive? You cannot tell from the client. This is the root of everything in
this lesson — and it's why blindly retrying a "charge the card" call can charge twice.

```text
  Client --- request --> Server     Two possibilities on a timeout:
  Client  X  no reply    Server       1. Server did it; the reply was lost
                                       2. Server never got the request
       (client can't distinguish these)
```

### Timeouts

A **timeout** is how long you wait before giving up on a request. Both extremes hurt:

- **Too short** — you abandon requests that would have succeeded, turning slow responses
  into false failures and extra load (from retries).
- **Too long** — you tie up threads, connections, and memory waiting on a dead peer,
  which can exhaust resources and cascade into a wider outage.

Set timeouts deliberately, based on the dependency's normal latency (e.g. a bit above its
p99), and always set *some* timeout — an unbounded wait is a resource leak.

### Retries, backoff, and jitter

Retrying can recover from a transient blip — but done carelessly it makes a struggling
service worse. Two disciplines are essential:

- **Exponential backoff:** wait longer between each attempt (e.g. 1s, 2s, 4s, 8s) instead
  of hammering immediately. This gives a recovering service room to breathe.
- **Jitter (randomness):** add a random amount to each wait so that many clients don't
  retry in **lockstep**. Without jitter, thousands of clients that failed together retry
  together — a synchronized wave that knocks the service down again.

```text
  attempt 1: wait ~1s  +/- random
  attempt 2: wait ~2s  +/- random
  attempt 3: wait ~4s  +/- random   (backoff grows; jitter spreads the load)
```

Also **cap the number of retries** and only retry when it's safe (see idempotency). A
**retry storm** — every client retrying a failing dependency at once — is a classic cause
of **cascading failure**; backoff, jitter, retry caps, and circuit breakers (Lesson 18)
are the defenses.

### Idempotency makes retries safe

An operation is **idempotent** if performing it **multiple times has the same effect as
performing it once**. Reads are naturally idempotent. `PUT` and `DELETE` are idempotent.
But "create an order" or "charge a card" (a `POST`) is **not** — so a retry could act
twice.

The fix (from Lesson 5) is an **idempotency key**: the client generates a unique key for
the logical operation and sends it with *every* retry. The server records "I processed key
K → result R." On a retry with the same key, it returns the stored result instead of doing
the work again.

```text
  charge(key=K, $10):
    if seen(K): return stored_result(K)   # retry: no second charge
    result = do_charge($10)
    store(K, result)
    return result
```

This turns a dangerous non-idempotent write into one you can retry freely — the standard
pattern for payments and any "must not happen twice" action. On the consumer side of a
queue, the same idea appears as **deduplication** by message id.

# Key Terminology

- **Timeout** — the maximum time to wait for a response before giving up.
- **Unknown outcome** — after a timeout, you can't tell if the operation succeeded.
- **Retry** — reissuing a failed request.
- **Exponential backoff** — increasing the wait between successive retries.
- **Jitter** — randomizing the wait so clients don't retry in lockstep.
- **Idempotent operation** — repeating it has the same effect as doing it once.
- **Idempotency key** — a client-supplied token that lets the server recognize and
  short-circuit a retry.
- **Retry storm** — many clients retrying at once, amplifying load and cascading failures.

# Options and Trade-offs

| Decision | Option | Trade-off |
| -------- | ------ | --------- |
| Timeout length | Short | Fewer stuck resources, but more false failures |
| Timeout length | Long | Fewer false failures, but risks resource exhaustion |
| Retry safe writes? | Only if idempotent (or keyed) | Safety vs risk of duplicate side effects |
| Backoff | Fixed interval | Simple, but risks synchronized retries |
| Backoff | Exponential + jitter | Recovers gracefully; a bit more complex |

# Worked Example

A checkout service calls a payment service. The call **times out** — the client doesn't
know if the charge happened.

**Naive approach:** retry immediately, no key. If the first charge actually succeeded, the
customer is now charged **twice**. And if the payment service is overloaded, every client
retrying at once makes it worse.

**Reliable approach:**

```text
  1. Timeout set to ~p99 + margin of the payment service.
  2. Client sends an Idempotency-Key with the charge, and reuses it on retries.
  3. On timeout, retry with exponential backoff + jitter, up to N times.
  4. Payment service: if it has seen the key, return the original result (no 2nd charge).
```

Now a timeout is harmless: the retry carries the same key, the payment service recognizes
it and returns the original charge, and backoff-with-jitter keeps the retries from becoming
a storm. The unknown outcome became a **safe** one.

# Real World Analogy

Imagine mailing a check and not getting a "received" reply. If you just mail another check
(retry without a key), you might pay twice. Instead, you write a **reference number** on
the check (the idempotency key); the vendor sees the same reference and knows it's the same
payment, not a new one. **Backoff and jitter** are like everyone who didn't get a reply
agreeing to call the vendor back at *slightly different* times, so the phone lines aren't
all jammed at once.

# Examples

## Example 1 — Basic: retrying an idempotent read

A service times out fetching a product (`GET`). Retrying is completely safe — a read has no
side effects — so a bounded retry with backoff simply recovers from the blip.

**Why this works:** reads are naturally idempotent; repeating one changes nothing.

## Example 2 — Real-world: idempotency key for a transfer

A banking API requires an idempotency key on transfers. A mobile client on a flaky network
retries a transfer three times with the same key; the server executes it once and returns
the same confirmation each time.

**Why this works:** the key lets the server distinguish a retry from a new transfer,
guaranteeing at-most-one effect.

## Example 3 — Trade-off / pitfall: the retry storm

A dependency slows down; every caller retries immediately and repeatedly with no backoff.
The extra load finishes the dependency off, and the outage spreads upstream.

**Why this bites:** synchronized, unbounded retries amplify load exactly when a service is
weakest. Backoff, jitter, retry caps, and circuit breakers prevent it.

# Common Mistakes

- **No timeout (or an unbounded one).** A dead dependency then ties up resources until you
  fall over.
- **Retrying non-idempotent writes without a key.** That's how double charges and
  duplicate records happen.
- **Immediate, unlimited retries.** They create retry storms; use exponential backoff,
  jitter, and a retry cap.
- **Backoff without jitter.** Clients still retry in lockstep, re-overloading the service.
- **Treating a timeout as "it failed."** The operation may have succeeded — design for the
  unknown outcome.

# Best Practices

- **Always set a timeout**, tuned to the dependency's normal latency (e.g. p99 + margin).
- **Only retry safe/idempotent operations**, and use **idempotency keys** for the rest.
- **Use exponential backoff *with jitter*** and a bounded retry count.
- **Add a circuit breaker** (Lesson 18) so you stop hammering a clearly-down dependency.
- **Make writes idempotent by design**, and dedupe on the consumer side by a stable id.

# Summary

- A network **timeout** leaves the outcome **unknown** — the operation may have succeeded or
  failed, and the client can't tell.
- Set **timeouts** deliberately: too short causes false failures, too long exhausts
  resources.
- **Retry** only what's safe, with **exponential backoff and jitter** and a **cap**, to
  avoid **retry storms** and cascading failure.
- **Idempotency** makes writes retry-safe; use **idempotency keys** for non-idempotent
  operations (and dedup on consumers).
- Together these turn an unreliable network into dependable behavior.

# Flash Cards

Q: Why does a timeout leave an operation's outcome "unknown"?
A: Because the client can't tell whether the operation succeeded and the response was lost, or the request never arrived. Both look the same from the client's side.

Q: What are the risks of setting a timeout too short vs too long?
A: Too short abandons requests that would have succeeded (false failures, extra load); too long ties up threads, connections, and memory on a dead peer, risking resource exhaustion.

Q: Why add jitter to exponential backoff?
A: So many clients that failed together don't retry in lockstep. Jitter spreads retries over time, preventing a synchronized wave that re-overloads the service.

Q: How does an idempotency key make a non-idempotent write safe to retry?
A: The client sends the same unique key on every retry; the server records the key's result and, on seeing it again, returns the original result instead of performing the operation twice.

Q: What is a retry storm and how do you prevent it?
A: Many clients retrying a failing dependency at once, amplifying load and cascading the failure. Prevent it with exponential backoff, jitter, retry caps, and circuit breakers.

Q: Which operations are safe to retry without special handling?
A: Idempotent ones — reads, and writes like PUT/DELETE — since repeating them has the same effect as doing them once.

# Exercises

### Easy
Classify each as safe or unsafe to retry blindly, and why: (a) GET /orders/5, (b) POST
/charges, (c) DELETE /sessions/abc, (d) PUT /users/5 with a full new record.

### Medium
Design a retry policy for calling a flaky downstream API: give a timeout, a backoff
schedule with jitter, and a retry cap. Explain what each choice protects against.

### Challenging
Your "place order" endpoint occasionally creates duplicate orders when clients retry after
timeouts. Design an end-to-end fix: what key the client sends, how the server stores and
checks it, how long it's retained, and how this interacts with an at-least-once event you
publish afterward.

# Further Reading

- AWS Builders' Library — "Timeouts, retries, and backoff with jitter" (Marc Brooker):
  https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/
- Michael Nygard, *Release It!* — timeouts and the stability patterns that depend on them.
