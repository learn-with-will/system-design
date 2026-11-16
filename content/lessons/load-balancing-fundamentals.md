---
slug: load-balancing-fundamentals
title: "Load Balancing Fundamentals"
topic: scaling-and-traffic
kind: concept
summary: "Distribute client traffic horizontally across server pools while eliminating single points of failure."
tags: [load-balancing, high-availability, scalability, traffic]
related: [layer-4-vs-layer-7-load-balancing, load-balancing-algorithms, health-checks-and-failover]
---
> **In one line:** Load balancers distribute incoming network traffic across multiple backend servers to maximize throughput, minimize latency, and eliminate single points of failure.

## The idea
A single web server, no matter how powerful, has finite hardware limits: maximum CPU cores, memory channels, and network interface card (NIC) bandwidth. Furthermore, relying on a single server creates a catastrophic **Single Point of Failure (SPoF)**: if the machine crashes or undergoes maintenance, the entire system is down.

A **Load Balancer (LB)** sits between client devices and the backend server pool. It acts as the public face of the application, accepting incoming client traffic and distributing requests across a pool of healthy backend servers. By spreading work horizontally, load balancers allow systems to handle traffic far exceeding the capacity of any single machine.

Beyond traffic distribution, load balancers fulfill several critical infrastructure roles:
1. **High Availability:** Continuously monitors the health of backend nodes. If a server stops responding, the load balancer stops routing traffic to it immediately.
2. **Horizontal Scalability:** Enables seamless addition or removal of backend servers based on fluctuating demand without client disruption.
3. **Security and Offloading:** Serves as a defensive barrier, terminating TLS encryption, filtering malicious traffic, and mitigating distributed denial-of-service (DDoS) attacks.

However, the load balancer itself cannot become a single point of failure! Production architectures deploy load balancers in **active-passive** or **active-active** redundant pairs using protocols like VRRP (Virtual Router Redundancy Protocol) or Anycast BGP routing.

## See it
Consider how a load balancer distributes traffic across a horizontally scaled backend tier:

```flow
client: Incoming Traffic | Thousands of concurrent users @neutral
lb-active: Primary Load Balancer | Virtual IP active @primary
lb-standby: Standby Load Balancer | VRRP heartbeat monitor @blue
app1: App Server 1 | Healthy (Serving 50%) @green
app2: App Server 2 | Healthy (Serving 50%) @green
client -> lb-active: Public VIP request
lb-active -> app1: Distribute 50%
lb-active -> app2: Distribute 50%
lb-active -> lb-standby: VRRP state sync
```

```yaml
# Simple HAProxy load balancer front-end and backend pool
frontend web_gateway
  bind *:80
  default_backend app_pool

backend app_pool
  balance roundrobin
  option httpchk GET /healthz
  server app1 10.0.1.11:8080 check
  server app2 10.0.1.12:8080 check
  server app3 10.0.1.13:8080 check backup
```

> **Note:** The load balancer continuously probes `/healthz`. If node 3 fails, traffic is instantly redistributed among nodes 1 and 2 without dropped user requests.

## Go deeper
In massive-scale cloud architectures, hardware load balancers are replaced by software-defined Layer 4 balancers (such as Google's Maglev or GitHub's GLB Director) running on commodity Linux servers. They utilize consistent hashing with connection tracking to distribute millions of packets per second across Layer 7 proxy tiers without maintaining shared state.
## Watch out
- Never deploy a single load balancer instance without a standby pair; an un-replicated load balancer is simply a single point of failure.
- Ensure health check endpoints are lightweight; an expensive health check that queries large database tables can induce cascading server failure.
## Remember
- Load balancers distribute traffic across server pools to enable horizontal scale and high availability.
- Load balancers must themselves be deployed in redundant pairs (active-passive with VRRP or Anycast).
- Continuous health checking isolates failing backend nodes before users experience connection errors.
