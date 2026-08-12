---
id: lesson-05
slug: designing-apis
title: "Designing APIs: REST, RPC & GraphQL"
level: beginner
order: 5
duration: 26
tags:
  - api
  - rest
  - grpc
  - graphql
  - idempotency
---

# Learning Objectives

By the end of this lesson you will be able to:

- Explain what an **API** is and why its design is a long-term commitment.
- Use **HTTP methods** and **status codes** correctly, and say which methods are **safe** and **idempotent**.
- Compare **REST**, **gRPC**, and **GraphQL** and choose between them.
- Design **pagination**, **versioning**, and **error** responses.
- Use an **idempotency key** to make retries safe.

# Why It Matters

An **API (Application Programming Interface)** is the contract between a service and its
callers. Once other teams or the public depend on it, changing it is painful — so API
design is one of the most durable decisions you make. Good APIs are predictable,
consistent, and hard to misuse; bad ones leak internal details and break clients on every
release.

# Concept Explanation

### REST over HTTP

**REST** is an architectural style (not a protocol) that models your system as
**resources** identified by URLs, acted on with standard HTTP **methods**. It is
**stateless** — each request carries everything the server needs. The HTTP semantics
(RFC 9110) define two important properties:

- **Safe**: the method is read-only and doesn't change server state.
- **Idempotent**: making the same request many times has the same effect as making it
  once.

| Method | Purpose | Safe? | Idempotent? |
| ------ | ------- | ----- | ----------- |
| GET | Read a resource | Yes | Yes |
| HEAD | Read headers only | Yes | Yes |
| PUT | Create/replace at a known URL | No | Yes |
| DELETE | Remove a resource | No | Yes |
| POST | Create / submit / trigger | No | No |
| PATCH | Partially update | No | Not guaranteed |

Idempotency matters because networks fail: if a client doesn't hear back, it may retry. A
retried `DELETE` or `PUT` is harmless; a retried `POST` (like "charge my card") can double
up — which is why POST needs extra care (see idempotency keys below).

**Status codes** communicate the outcome: `2xx` success (200 OK, 201 Created, 204 No
Content), `3xx` redirect, `4xx` the client's fault (400 Bad Request, 401 Unauthorized,
403 Forbidden, 404 Not Found, 409 Conflict, 429 Too Many Requests), `5xx` the server's
fault (500 Internal Server Error, 503 Service Unavailable). Using them correctly lets
clients react without parsing prose.

```http
POST /v1/orders HTTP/1.1
Content-Type: application/json

{ "item": "coffee-mug", "quantity": 2 }

HTTP/1.1 201 Created
Location: /v1/orders/8a3f
```

### RPC and gRPC

**RPC (Remote Procedure Call)** makes a call to another service look like calling a local
function: `createOrder(item, qty)`. **gRPC** is a popular RPC framework that runs over
HTTP/2 and encodes messages with **Protocol Buffers** (a compact binary format). It is
fast, supports streaming, and generates client/server code from a schema — excellent for
**service-to-service** communication inside your system. The trade-off: binary payloads
are harder to inspect, and browsers need a shim (gRPC-Web) to use it directly.

### GraphQL

**GraphQL** is a query language for APIs. Instead of many fixed endpoints, the client
sends one query to a single endpoint asking for **exactly the fields it wants**:

```text
  query {
    user(id: "42") { name, avatarUrl, posts(last: 3) { title } }
  }
```

This solves **over-fetching** (getting more than you need) and **under-fetching** (having
to make several calls to assemble a screen), which makes it popular for rich mobile and
web clients. The costs: HTTP caching is harder (most queries are POSTs to one URL), a
careless query can be expensive, and the server must guard against deep or costly queries.

# Key Terminology

- **API** — the contract for how clients call a service.
- **REST** — a resource-and-HTTP-method architectural style; stateless.
- **Safe method** — read-only, no state change (GET, HEAD).
- **Idempotent method** — repeating it has the same effect as doing it once (GET, PUT,
  DELETE).
- **RPC / gRPC** — calling a remote procedure like a local function; gRPC uses HTTP/2 +
  Protocol Buffers.
- **GraphQL** — a query language where the client specifies exactly which fields to
  return.
- **Over-/under-fetching** — getting too much data, or needing multiple calls to get
  enough.
- **Pagination** — returning large result sets in chunks.
- **Idempotency key** — a client-supplied unique token that makes a repeated write safe.

# Options and Trade-offs

| Style | Best for | Strengths | Watch out for |
| ----- | -------- | --------- | ------------- |
| REST | Public APIs, CRUD over resources | Simple, cacheable, universally understood | Over-/under-fetching; many endpoints |
| gRPC | Internal service-to-service | Fast, binary, streaming, code-gen | Not browser-native; harder to debug by eye |
| GraphQL | Rich clients assembling varied data | Client picks fields; one round trip | Caching and cost control are harder |

# Worked Example

Design the **"create order"** endpoint so a flaky network can't double-charge a customer.

The problem: the client sends `POST /v1/orders`, the order is created, but the response
is lost. The client retries — and without protection, you create a second order.

The fix is an **idempotency key**: the client generates a unique key for the operation
and sends it with every retry of the *same* logical request.

```http
POST /v1/orders HTTP/1.1
Idempotency-Key: 4d1a-77c2-9e10
Content-Type: application/json

{ "item": "coffee-mug", "quantity": 2 }
```

The server records "I processed key `4d1a-77c2-9e10` → order `8a3f`." On a retry with the
same key, it returns the *original* result instead of creating a new order.

```text
  1st POST (key K) -> create order 8a3f, store (K -> 8a3f), return 201
  retry  POST (key K) -> key seen; return the stored 201 for 8a3f (no new order)
```

We turned a non-idempotent POST into a safely retryable one — the standard pattern for
payments and any "create" that must not run twice.

# Real World Analogy

HTTP methods are like actions at a library. **GET** is reading a book on the shelf (safe:
you change nothing). **PUT** is replacing a book at a specific slot (do it twice, same
result). **DELETE** is removing a book (gone is gone, whether you ask once or twice).
**POST** is submitting a new membership form — do it twice and you might get two
memberships, which is why the form has a confirmation number (an idempotency key) so the
clerk knows it's the same request.

# Examples

## Example 1 — Basic: correct status codes

A client asks for a user that doesn't exist. Returning `404 Not Found` (not `200 OK` with
an empty body) lets the client handle it correctly and lets caches and monitoring behave
sensibly.

**Why this works:** status codes are a shared language; using them precisely means
clients don't have to guess by parsing the body.

## Example 2 — Real-world: cursor pagination for an activity feed

An endpoint returns a feed of millions of items. Instead of `?offset=100000&limit=20`
(which gets slower the deeper you go and shifts when new items arrive), it returns a
**cursor** — an opaque pointer to "where you left off" — and the client asks for the next
page with `?after=<cursor>`.

**Why this works:** cursor (keyset) pagination stays fast and stable even as data grows
and changes underneath it.

## Example 3 — Trade-off / pitfall: breaking clients with a silent change

A team renames a JSON field from `userName` to `username` in place. Every existing client
breaks overnight.

**Why this bites:** an API is a contract. Breaking changes need a new **version**
(e.g. `/v2/`) so existing clients keep working while new ones adopt the change.

# Common Mistakes

- **Using POST for everything.** Model reads as GET and replacements as PUT so
  idempotency and caching work for you.
- **Returning 200 for errors.** Use the right status code; don't hide failures behind a
  success code and an error message in the body.
- **Offset pagination on huge datasets.** Deep offsets get slow and unstable; prefer
  cursor/keyset pagination.
- **Breaking changes without versioning.** Renaming or removing fields breaks clients;
  version the API instead.
- **Ignoring retries.** Any non-idempotent write that must not run twice needs an
  idempotency key.

# Best Practices

- **Map operations to HTTP methods** and return accurate **status codes**.
- **Design for idempotency**: use idempotent methods where you can, and idempotency keys
  for critical POSTs.
- **Paginate large collections**, preferring cursors for big or changing data.
- **Version your API** and evolve additively (add fields; don't repurpose them).
- **Return consistent, machine-readable errors** (a stable shape with a code and
  message).
- **Pick the style to the job**: REST for public CRUD, gRPC for internal calls, GraphQL
  for rich clients.

# Summary

- An **API** is a durable contract; design it to be predictable and hard to misuse.
- **REST** uses resources, HTTP methods, and status codes; **GET/PUT/DELETE are
  idempotent** and **GET is safe**, while **POST is neither**.
- **gRPC** (HTTP/2 + Protocol Buffers) is great for fast internal service-to-service
  calls; **GraphQL** lets clients fetch exactly the fields they need.
- Use **cursor pagination**, **versioning**, and **consistent error responses**.
- Make risky writes safe to retry with an **idempotency key**.

# Flash Cards

Q: Which common HTTP methods are idempotent?
A: GET, HEAD, PUT, and DELETE are idempotent. POST is not, and PATCH is not guaranteed to be.

Q: What does it mean for a method to be "safe"?
A: It is read-only and does not change server state — GET and HEAD are safe.

Q: Why does a POST that charges a card need an idempotency key?
A: POST is not idempotent, so a network retry could charge twice. An idempotency key lets the server recognize the retry and return the original result instead of acting again.

Q: When would you choose gRPC over REST?
A: For fast internal service-to-service communication, where its HTTP/2 + Protocol Buffers efficiency, streaming, and code generation pay off (browsers, though, need gRPC-Web).

Q: What problem does GraphQL solve, and what does it make harder?
A: It lets clients request exactly the fields they need (avoiding over- and under-fetching), but it makes HTTP caching and query-cost control harder.

Q: Why prefer cursor pagination over offset pagination for large datasets?
A: Cursor (keyset) pagination stays fast and stable as data grows and changes, while deep offsets get slow and shift when items are inserted.

# Exercises

### Easy
For each action, name the right HTTP method and a success status code: (a) fetch a
product, (b) create a product, (c) delete a product, (d) replace a product entirely.

### Medium
Design the request and response for "add an item to a cart," making it safe to retry.
Show the method, the idempotency mechanism, and the status codes for first-try and
retry.

### Challenging
Your mobile team complains they make 5 REST calls to render one profile screen and still
download fields they don't use. Evaluate switching that screen to GraphQL: what improves,
what new risks appear (caching, expensive queries), and how would you mitigate them?

# Further Reading

- MDN Web Docs — "HTTP request methods" and "HTTP response status codes":
  https://developer.mozilla.org/en-US/docs/Web/HTTP
- IETF RFC 9110 — "HTTP Semantics" (safe and idempotent methods; status codes).
- gRPC documentation — https://grpc.io/docs/ ; GraphQL specification —
  https://spec.graphql.org/
