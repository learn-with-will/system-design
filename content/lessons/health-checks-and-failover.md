---
slug: health-checks-and-failover
title: "Health Checks & Failover"
topic: scaling-and-traffic
kind: technique
summary: "Distinguish active vs passive health checks, graceful connection draining, and flapping prevention."
tags: [health-checks, failover, high-availability, sre]
related: [load-balancing-fundamentals, circuit-breaker-pattern, single-points-of-failure]
---
> **In one line:** Health checks detect failing backend nodes to remove them from traffic pools, while connection draining enables zero-downtime deploys.

## The idea
A load balancer is only as effective as its health checking mechanism. If a server crashes, runs out of memory, or deadlocks its database connection pool, the load balancer must detect the failure within seconds and route subsequent traffic elsewhere.

Health checking operates in two primary modes:
1. **Active Health Checks:** The load balancer periodically sends dedicated probe requests (e.g., an HTTP GET to `/healthz` every 5 seconds). If a node fails to return HTTP 200 within a timeout (e.g., 2 seconds) for $N$ consecutive attempts, the load balancer marks the node as unhealthy and evicts it from the active rotation. Once the node successfully passes $M$ consecutive probes, it is admitted back into service.
2. **Passive Health Checks:** The load balancer observes live user traffic. If a backend server returns HTTP 500 or drops TCP connections for a percentage of real requests within a time window, the balancer temporarily sidelines that node without relying solely on synthetic probes.

When rolling out updates or retiring nodes, servers must undergo **Graceful Connection Draining** (also known as deregistration delay). Instead of severing active connections immediately, the load balancer stops routing *new* connections to the retiring node while permitting existing in-flight HTTP requests and database transactions to finish cleanly before terminating the container.

## See it
Consider how connection draining isolates a retiring container during a deployment:

```flow
client-new: New Requests | Routed to V2 @neutral
client-old: In-Flight Requests | Completed by V1 @neutral
lb: Load Balancer | Observes deployment status @primary
node-new: Node V2 (Healthy) | Accepting new traffic @green
node-old: Node V1 (Draining) | In-flight requests finishing @amber
drain: Drain Complete | Zero new requests @blue
client-new -> lb: Incoming traffic
lb -> node-new: Route 100% of new traffic
client-old -> node-old: Complete active transactions
node-old -> drain: Safe termination
```

```yaml
# Kubernetes readiness and liveness probe configuration
apiVersion: v1
kind: Pod
metadata:
  name: order-service
spec:
  containers:
  - name: app
    image: order-service:v1.2
    # Liveness probe restarts deadlocked containers
    livenessProbe:
      httpGet:
        path: /healthz/liveness
        port: 8080
      initialDelaySeconds: 10
      periodSeconds: 10
    # Readiness probe controls traffic routing from load balancer
    readinessProbe:
      httpGet:
        path: /healthz/readiness
        port: 8080
      periodSeconds: 5
      failureThreshold: 2
```

> **Tip:** Separate **Liveness** from **Readiness**. A liveness check answers: "Is the process deadlocked (should it be rebooted)?". A readiness check answers: "Is the service ready to accept user traffic (are caches warmed, schema migrated)?".

## Go deeper
Flapping occurs when a struggling server under heavy load fails a health check, is detached from the load balancer, instantly recovers because its load drops to zero, passes the next health check, is re-admitted to traffic, and immediately crashes again. Load balancers combat flapping using **hysteresis**: requiring multiple consecutive successes (e.g., 5 consecutive successes) and slow-start ramping before returning a node to full traffic.
## Watch out
- Do not perform deep dependency checks (like pinging third-party APIs) inside your health check endpoint; downstream outages will cause your entire cluster to declare itself unhealthy!
- Always configure connection draining timeouts long enough to allow long-running operations (like file uploads) to complete.
## Remember
- Active health checks send periodic synthetic probes; passive checks monitor real user traffic failure rates.
- Separate liveness (process is alive) from readiness (process is prepared to serve traffic).
- Graceful connection draining allows in-flight requests to complete cleanly before terminating instances.
