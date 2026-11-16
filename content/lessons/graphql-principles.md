---
slug: graphql-principles
title: "GraphQL Principles"
topic: networking-and-apis
kind: api
summary: "Solve over-fetching and under-fetching with client-specified queries, schema stitching, and DataLoader batching."
tags: [graphql, api, dataloader, schema]
related: [rest-and-resource-modeling, rpc-and-grpc, api-pagination-and-versioning]
---
> **In one line:** GraphQL allows clients to request exactly the data fields they need in a single round trip, trading off server complexity and caching.

## The idea
In traditional REST architectures, backend engineers define the shape of API responses. As client applications evolve (especially mobile apps with constrained cellular bandwidth and small screens), this leads to two persistent problems:
1. **Over-fetching:** The client needs only a user's name, but the `GET /users/{id}` endpoint returns 50 fields, including address history, permissions, and billing metadata.
2. **Under-fetching:** To render a profile page, the client must make multiple sequential HTTP calls: `GET /users/{id}`, then `GET /users/{id}/posts`, then `GET /posts/{id}/comments`. On high-latency mobile networks, these multiple round trips degrade user experience.

Developed by Facebook in 2012, **GraphQL** solves this by inverting control: the backend provides a strongly typed schema of types and relationships, and the **client specifies exactly what fields it wants** in a declarative query. The server traverses its graph of resolvers and returns a single JSON response mirroring the requested structure.

However, GraphQL introduces substantial backend challenges:
- **Caching Complexity:** Because all requests are typically sent as HTTP POST queries to a single `/graphql` endpoint, standard HTTP proxy and CDN caching based on URLs cannot be used without complex normalized client caches (like Apollo Client) or persisted queries.
- **The $N+1$ Problem:** If a query requests 20 users and their recent posts, a naive resolver executes 1 database query for the users, and then 20 separate database queries for each user's posts. This is mitigated using the **DataLoader** pattern, which batches and deduplicates database fetches within a single tick of the event loop.

## See it
Consider a declarative GraphQL query fetching nested entities in a single round trip:

```json
// Client POST to /graphql with GraphQL query payload
{
  "query": "query GetUserProfile($id: ID!) { user(id: $id) { name email avatarUrl posts(limit: 2) { title views } } }",
  "variables": { "id": "usr_99" }
}

// Server returns exact JSON structure matching the query
{
  "data": {
    "user": {
      "name": "Jane Doe",
      "email": "jane@example.com",
      "avatarUrl": "https://cdn.example.com/avatars/99.avif",
      "posts": [
        { "title": "Scaling Distributed Caches", "views": 1420 },
        { "title": "Understanding the CAP Theorem", "views": 3890 }
      ]
    }
  }
}
```

```yaml
# Architecture trade-offs: REST vs GraphQL
trade_offs:
  data_transfer:
    rest: "Fixed payloads; risk of over/under-fetching"
    graphql: "Optimal payload size; client requests exact fields"
  network_roundtrips:
    rest: "Multiple roundtrips for nested resources"
    graphql: "Single roundtrip for nested graph"
  edge_caching:
    rest: "Seamless HTTP caching via URL and Cache-Control"
    graphql: "Complex; requires persisted queries or gateway plugins"
  backend_query_complexity:
    rest: "Predictable, tuned SQL queries per endpoint"
    graphql: "Arbitrary nested queries; requires DataLoader and query depth limits"
```

> **Tip:** Always implement **Query Depth Limiting** and **Query Cost Analysis** on production GraphQL servers to prevent malicious clients from sending circular, deeply nested queries that exhaust database resources.

## Go deeper
Federated GraphQL (such as Apollo Federation) allows independent microservice teams to own distinct subgraphs (e.g., Accounts service owns User type, Inventory service owns Product type). An API gateway composes these subgraphs into a unified supergraph, orchestrating query execution across backend services transparently.
## Watch out
- Never deploy GraphQL to production without a DataLoader batching mechanism; unbatched resolvers will overwhelm your database with $N+1$ queries.
- Protect public GraphQL endpoints from denial-of-service by enforcing max query depth limits and query complexity scores.
## Remember
- GraphQL eliminates over-fetching and under-fetching by letting clients specify exact response shapes.
- Nested resolvers require DataLoader batching to prevent catastrophic $N+1$ database queries.
- GraphQL trades off trivial HTTP edge caching for frontend query flexibility and single-roundtrip data retrieval.
