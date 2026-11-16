---
slug: api-gateway-pattern
title: "The API Gateway Pattern"
topic: asynchronous-systems
kind: pattern
summary: "Consolidate cross-cutting concerns: reverse proxy routing, authentication, rate limiting, and protocol translation."
tags: [api-gateway, microservices, routing, architecture]
related: [rate-limiting-fundamentals, distributed-rate-limiting, reverse-proxies-and-ssl-termination]
---
> **In one line:** An API Gateway sits between client devices and backend microservices, consolidating cross-cutting concerns like auth, rate limiting, and request routing.

## The idea
In a microservices architecture, exposing dozens of internal services directly to public mobile and web clients introduces major problems:
- Clients must manage dozens of backend service URLs and port numbers.
- If an internal service changes from HTTP to gRPC, or is split into two smaller services, every client application must be updated.
- Every individual microservice team must redundantly implement TLS termination, OAuth token validation, CORS headers, rate limiting, and audit logging.

The **API Gateway Pattern** introduces a reverse proxy layer that serves as the single public entry point for all client traffic. External clients communicate exclusively with the API Gateway, and the gateway routes requests to the appropriate internal backend microservices.

An API Gateway consolidates **cross-cutting concerns**:
1. **Request Routing & Path Rewriting:** Maps public URLs like `/api/v1/orders` to private internal microservice addresses like `http://order-svc.internal:8080`.
2. **Authentication & Authorization:** Validates client JWT signatures or API keys at the perimeter, stripping invalid requests before they consume internal network bandwidth.
3. **Rate Limiting & Throttling:** Enforces global and tenant-specific quotas at the edge.
4. **Protocol Translation:** Accepts public REST/JSON over HTTP/1.1 or HTTP/2 from browsers and translates it into high-performance binary gRPC over HTTP/2 for internal service communication.
5. **Request Aggregation (BFF - Backend for Frontend):** Fans out a single client request to three backend services in parallel and merges the responses into a unified JSON payload.

## See it
Consider how an API Gateway insulates internal microservices from external clients:

```sequence
actor client: Web & Mobile | Public Internet @neutral
actor gateway: API Gateway | Edge proxy @primary
actor orders: Order Service | Internal gRPC @green
actor catalog: Catalog Service | Internal gRPC @green
client -> gateway: POST /api/v1/checkout
note gateway: Verify JWT & Rate Limit
gateway -> orders: gRPC CreateOrder()
orders --> gateway: Order created
gateway -> catalog: gRPC ReserveStock()
catalog --> gateway: Stock reserved
gateway --> client: 201 Created | Unified JSON
```

```yaml
# Envoy API Gateway route configuration snippet
routes:
- match: { prefix: "/api/v1/orders" }
  route:
    cluster: order_service_cluster
    timeout: 3s
    retry_policy:
      retry_on: "5xx"
      num_retries: 2
  typed_per_filter_config:
    envoy.filters.http.jwt_authn:
      provider_name: "auth0"
```

> **Tip:** Popular API Gateway implementations include Envoy Proxy, Kong, Traefik, AWS API Gateway, and Cloudflare.

## Go deeper
The **Backend for Frontend (BFF)** variant deploys dedicated, lightweight API gateways tailored for specific client types (e.g., an iOS BFF Gateway optimized for small screen payloads, and a Web Desktop BFF Gateway that returns rich analytics). This prevents client teams from blocking on a monolithic gateway team.
## Watch out
- Do not place business logic or domain rules inside the API Gateway; it should handle only cross-cutting infrastructure concerns.
- Ensure the API Gateway is deployed across multiple availability zones; an un-replicated gateway is a single point of failure.
## Remember
- The API Gateway serves as the single entry point consolidating routing, auth, rate limiting, and metrics.
- It insulates public clients from internal microservice refactoring and protocol migrations.
- Avoid bloating the gateway with domain business logic; keep it strictly focused on cross-cutting routing concerns.
