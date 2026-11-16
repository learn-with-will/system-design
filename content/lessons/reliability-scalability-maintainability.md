---
slug: reliability-scalability-maintainability
title: "Reliability, Scalability & Maintainability"
topic: foundations
kind: concept
summary: "Master the three foundational pillars of data systems framed by Martin Kleppmann in DDIA."
tags: [ddia, reliability, scalability, maintainability]
related: [what-is-system-design, functional-vs-non-functional-requirements, the-nature-of-trade-offs]
---
> **In one line:** Good data systems balance reliability (fault tolerance), scalability (handling growth), and maintainability (operability and evolution).

## The idea
In *Designing Data-Intensive Applications*, Martin Kleppmann provides a foundational framework for evaluating any software architecture by distilling system qualities into three pillars: reliability, scalability, and maintainability.

**Reliability** means continuing to work correctly—performing the expected function at the desired level of performance—even in the face of adversity. Adversity comes in the form of *faults*: hardware malfunctions (disks failing, network switches dropping packets), software bugs (memory leaks, unhandled exceptions), and human errors (bad configuration deployments). A critical distinction is that a *fault* is a component deviating from its spec, whereas a *failure* occurs when the entire system stops delivering its required service to users. Reliable architectures prevent internal faults from escalating into user-visible failures through redundancy, health checks, and isolation.

**Scalability** describes a system's ability to cope with increased load. Scalability is not a single one-dimensional label; a system is not simply "scalable" or "unscalable." Rather, scalability asks: "If the system grows in a particular way (e.g., double the active users, triple the write QPS, 10x data volume), what architectural options do we have to maintain acceptable performance?"

**Maintainability** accounts for the reality that the majority of software cost is incurred during maintenance, not initial development. It consists of three dimensions: *operability* (making it easy for operations teams to monitor and maintain system health), *simplicity* (managing complexity and avoiding accidental complexity), and *evolvability* (making it straightforward to modify the system for unanticipated requirements).

## See it
Consider how faults are isolated to maintain reliability without causing system failure:

```flow
client: External Traffic | Incoming requests @neutral
lb: Health Checker | Detaches Node A @primary
node1: Worker Node A | Degraded / crashing @red
node2: Worker Node B | Healthy @green
node3: Worker Node C | Healthy @green
client -> lb: HTTP traffic
lb -> node2: Forward 50%
lb -> node3: Forward 50%
lb -> node1: Health probe failed
```

```yaml
# Kubernetes pod reliability specification
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-processor
spec:
  replicas: 3
  strategy:
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
      - name: app
        image: order-processor:v2.1
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          failureThreshold: 3
```

> **Note:** The deployment maintains zero unavailable replicas during rollouts and monitors container health continuously to isolate failing pods before users experience errors.

## Go deeper
Human error is statistically the leading cause of production outages, far exceeding physical hardware failures. Reliable systems mitigate human error by decoupling administrative sandbox environments from production, building automated rollback tooling, and requiring automated unit and integration tests before any artifact is promoted.
## Watch out
- Do not confuse a fault with a failure; a single disk crash is a fault, but data loss is a system failure.
- Never sacrifice maintainability for clever micro-optimizations that obscure system architecture and increase cognitive load.
## Remember
- Reliability means preventing component faults from becoming system-wide failures.
- Scalability measures how gracefully a system handles growth in load or data volume.
- Maintainability ensures systems remain operable, simple to understand, and safe to modify.
