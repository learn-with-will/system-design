---
slug: vertical-vs-horizontal-scaling
title: "Vertical vs Horizontal Scaling"
topic: scaling-and-traffic
kind: concept
summary: "Compare scaling up with bigger machines against scaling out with commodity clusters and distributed tiers."
tags: [scalability, horizontal-scaling, vertical-scaling, cloud]
related: [stateless-service-architecture, the-scale-cube, sharding-fundamentals]
---
> **In one line:** Vertical scaling adds resources to a single node until hardware limits and costs explode; horizontal scaling adds multiple nodes to distribute load indefinitely.

## The idea
When application load outgrows existing hardware capacity, system designers have two primary scaling strategies: scaling up (vertical) or scaling out (horizontal).

**Vertical Scaling (Scale Up):**
Vertical scaling means replacing your current machine with a more powerful server: adding more CPU cores, faster clock speeds, more RAM, and larger NVMe disks. 
- *Advantages:* Architecturally simple. Your application code, database transactions, inter-process communication, and tooling remain identical. There is no distributed state, no network serialization overhead, and no distributed consensus.
- *Disadvantages:* Severe hardware ceilings. Even the largest cloud instances (e.g., AWS `u-24tb1.112xlarge` with 448 vCPUs and 24 TB RAM) have absolute physical limits. Furthermore, cost scales non-linearly: top-tier hardware carries astronomical price premiums. Most critically, a single massive machine remains a catastrophic Single Point of Failure (SPoF).

**Horizontal Scaling (Scale Out):**
Horizontal scaling means distributing load across a pool of smaller, commodity server instances behind a load balancer.
- *Advantages:* Virtually limitless linear expansion. You can scale dynamically from 5 instances to 500 instances during peak hours and scale back down at night to minimize cloud costs. High availability is built-in: any single instance can crash without impacting overall system uptime.
- *Disadvantages:* Demands stateless application architecture. State must be externalized, network latency between nodes must be managed, and distributed data consistency must be maintained.

## See it
Compare the cost, limits, and architectural characteristics of both scaling models:

| Dimension | Vertical Scaling (Scale Up) | Horizontal Scaling (Scale Out) |
|---|---|---|
| **Approach** | Upgrade to a larger server instance | Add more commodity server instances |
| **Architectural Impact** | Zero code changes; single-node semantics | Requires stateless compute, decoupled state |
| **Scalability Limit** | Hard physical hardware ceiling | Theoretically infinite linear scaling |
| **Cost Curve** | Exponential (extreme cost for top-tier hardware) | Linear (pay only for incremental commodity nodes) |
| **Resilience & SPoF** | High risk; machine reboot causes total outage | Fault-tolerant; dead nodes replaced transparently |
| **Elasticity** | Slow; requires instance reboot / resizing | Instant; dynamic auto-scaling groups in minutes |

```yaml
# AWS Auto Scaling Group configuration for horizontal scaling
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-autoscaler
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

> **Note:** Horizontal scaling allows the cluster to automatically expand during traffic spikes and contract when load recedes, aligning infrastructure costs directly with actual user demand.

## Go deeper
While horizontal scaling is the standard for application and compute tiers, relational databases historically scaled vertically because maintaining ACID transactions across distributed nodes was complex. Modern distributed SQL databases (Google Spanner, CockroachDB) achieve horizontal scalability for transactional storage by combining Raft consensus with synchronized atomic clocks.
## Watch out
- Do not prematurely horizontally scale complex databases when vertical scaling to a larger RDS instance can buy years of engineering runway.
- Remember that horizontal scaling requires that the application tier be strictly stateless.
## Remember
- Vertical scaling upgrades a single machine; horizontal scaling distributes load across multiple nodes.
- Vertical scaling is simple but hits hard hardware ceilings and creates single points of failure.
- Horizontal scaling enables dynamic elasticity, fault tolerance, and near-infinite growth.
