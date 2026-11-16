---
slug: rest-and-resource-modeling
title: "REST & Resource Modeling"
topic: networking-and-apis
kind: pattern
summary: "Design clean RESTful HTTP APIs with noun-based resources, correct status codes, and safe/idempotent methods."
tags: [api, rest, http, api-design]
related: [rpc-and-grpc, graphql-principles, api-pagination-and-versioning]
---
> **In one line:** REST models systems as addressable resources manipulated via standard HTTP methods, with strict guarantees around safety and idempotency.

## The idea
Representational State Transfer (REST), articulated by Roy Fielding in his 2000 doctoral dissertation, is the predominant architectural style for web-facing APIs. Rather than thinking of an API as a collection of remote procedure calls (`getUser()`, `updateUserProfile()`, `deleteOrder()`), REST models the system as a collection of **resources** identified by stable URLs and acted upon using standard HTTP methods.

Core REST conventions include:
1. **Noun-based URIs:** URIs represent entities (nouns), not actions (verbs). Use `/api/v1/orders` instead of `/api/v1/getOrders` or `/api/v1/createOrder`. Hierarchical relationships map cleanly: `/api/v1/users/{id}/orders`.
2. **Plural Nouns:** Standardize on plural nouns for collections: `/users`, `/products`, `/accounts`.
3. **HTTP Status Codes:** Leverage standard HTTP status families: `2xx` for success (200 OK, 201 Created, 204 No Content), `4xx` for client errors (400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 429 Too Many Requests), and `5xx` for server failures (500 Internal Error, 502 Bad Gateway, 503 Service Unavailable).

A critical architectural distinction defined by RFC 9110 is the difference between **safe** and **idempotent** HTTP methods:
- **Safe Methods (GET, HEAD, OPTIONS):** Safe operations do not alter server state. Clients can execute them repeatedly without side effects.
- **Idempotent Methods (GET, PUT, DELETE, HEAD):** An operation is idempotent if making the request $N$ times produces the identical server state as making it once. Deleting user 42 three times results in the same final state: user 42 does not exist.
- **Non-Idempotent Methods (POST, PATCH):** Submitting a POST request three times creates three distinct orders, charging the customer's card three times.

## See it
Compare HTTP methods across safety, idempotency, and standard semantic usage:

| HTTP Method | Safe? | Idempotent? | Semantic Action | Success Code |
|---|---|---|---|---|
| **GET** | Yes | Yes | Retrieve a resource representation | 200 OK |
| **POST** | No | No | Create a new child resource / submit form | 201 Created |
| **PUT** | No | Yes | Replace an entire resource (or create at URI) | 200 OK / 204 No Content |
| **PATCH** | No | No* | Apply partial modifications to a resource | 200 OK |
| **DELETE** | No | Yes | Remove a resource | 200 OK / 204 No Content |

```http
// Good RESTful request: Creating an order under a specific user
POST /api/v1/users/usr_482/orders HTTP/1.1
Host: api.example.com
Content-Type: application/json

{
  "items": [{ "sku": "WIDGET-01", "quantity": 2 }],
  "currency": "USD"
}

// Response indicating created resource with canonical Location header
HTTP/1.1 201 Created
Location: /api/v1/users/usr_482/orders/ord_9912
Content-Type: application/json

{
  "id": "ord_9912",
  "status": "pending",
  "total_cents": 4999
}
```

> **Note:** PATCH can be implemented idempotently (e.g., setting a specific field value), but mathematically it is not guaranteed to be idempotent (e.g., an operation that appends an item to an array).

## Go deeper
The Richardson Maturity Model categorizes APIs into four levels: Level 0 (The Swamp of POX - single URI RPC over HTTP), Level 1 (Individual Resource URIs), Level 2 (Standard HTTP Verbs and Status Codes), and Level 3 (HATEOAS - Hypermedia as the Engine of Application State, where responses include hypermedia links to valid next actions). Most production enterprise APIs target Level 2.
## Watch out
- Never use GET requests for operations that modify server state; search crawlers and browser pre-fetchers will trigger state mutations.
- Avoid returning HTTP 200 OK with an error payload `{ "error": "not found" }`; use standard HTTP status codes so infrastructure proxies understand failures.
## Remember
- URIs should represent nouns (`/orders`), while standard HTTP verbs represent actions.
- GET is safe and idempotent; PUT and DELETE are idempotent; POST is neither safe nor idempotent.
- Use accurate HTTP status codes (2xx, 4xx, 5xx) so intermediate caches and monitoring tools understand request outcomes.
