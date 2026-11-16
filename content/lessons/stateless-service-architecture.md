---
slug: stateless-service-architecture
title: "Stateless Service Architecture"
topic: scaling-and-traffic
kind: pattern
summary: "Decouple compute from state to enable instantaneous auto-scaling, blue-green deploys, and node replacements."
tags: [stateless, architecture, scalability, microservices]
related: [vertical-vs-horizontal-scaling, externalizing-session-state, the-scale-cube]
---
> **In one line:** A stateless service treats every HTTP request independently without retaining local client state between calls, allowing any server to handle any request.

## The idea
The prerequisite for horizontal scalability in modern cloud computing is **statelessness**. A service is stateless if it does not retain conversational client state, session data, or modified business files in local instance memory or on local disk between requests.

In a stateful architecture, user authentication sessions, shopping cart contents, or uploaded files reside on the specific server instance that handled the user's first request. Consequently, the load balancer must configure **sticky sessions** (routing that specific user to that specific machine). If that server instance crashes, the user's session is abruptly lost. Furthermore, instances cannot be scaled down or rolled over without kicking active users off the system.

In a **stateless architecture**, every request carries all the context required to process it (e.g., a signed cryptographic JWT token), or the service immediately externalizes state to a dedicated, shared state store (like Redis, PostgreSQL, or S3). Because no application server retains local state:
1. **Any server can fulfill any request:** The load balancer can distribute traffic using simple round-robin or least-connections.
2. **Auto-scaling is instant:** New instances can boot up and immediately begin handling traffic without warming local session caches.
3. **Chaos-resilient:** Any application container can be terminated abruptly during deployments without data loss or user session interruption.

## See it
Compare how requests flow in stateful vs stateless architectures:

```flow
client: Web Client | Request 1 and Request 2 @neutral
lb: Load Balancer | Any server can answer @primary
app1: App Server 1 | Stateless container @green
app2: App Server 2 | Stateless container @green
redis: Shared Redis Cluster | Externalized sessions @blue
db: PostgreSQL Primary | Externalized database @blue
client -> lb: Request 1
lb -> app1: Process Request 1
app1 -> redis: Read/write session
client -> lb: Request 2
lb -> app2: Process Request 2 (Different server!)
app2 -> redis: Read/write session
app1 -> db: SQL Query
app2 -> db: SQL Query
```

```javascript
// Anti-pattern: Stateful in-memory session tracking (DO NOT DO THIS)
const activeUsers = new Map(); // Breaks when scaling to 2+ servers!
app.post('/login', (req, res) => {
  activeUsers.set(req.body.userId, { authenticated: true, cart: [] });
});

// Production pattern: Stateless externalized session tracking
app.post('/login', async (req, res) => {
  const sessionId = crypto.randomUUID();
  // State externalized to shared Redis cluster with TTL
  await redis.setex(`session:${sessionId}`, 86400, JSON.stringify({ userId: req.body.userId }));
  res.cookie('sid', sessionId, { httpOnly: true, secure: true });
});
```

> **Watch out:** Never write user-uploaded files to the local container disk (`/tmp` or `/uploads`). In containerized environments (Kubernetes), local disks are ephemeral. When a pod restarts, files disappear, and concurrent servers cannot access each other's files. Use shared object storage (S3).

## Go deeper
While compute tiers are stateless, state itself does not disappear—it is merely shifted down the stack into dedicated distributed data stores. By consolidating state in specialized storage engines (Redis for sessions, PostgreSQL for transactions, S3 for media), you allow the database team to focus on replication and persistence while the application team enjoys frictionless horizontal scaling.
## Watch out
- Do not store background job locks or in-memory caches locally on an application node if other nodes need access to that state.
- Avoid relying on sticky sessions as a long-term architectural crutch for poorly externalized session state.
## Remember
- Stateless services retain no local client state between requests, allowing any node to answer any call.
- Externalize session state to distributed caches (Redis) and files to object storage (S3).
- Statelessness enables rapid horizontal auto-scaling and zero-downtime rolling deployments.
