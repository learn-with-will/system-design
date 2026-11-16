---
slug: load-balancing-algorithms
title: "Load Balancing Algorithms"
topic: scaling-and-traffic
kind: technique
summary: "Select optimal traffic distribution: Round Robin, Least Connections, IP Hash, and Weighted variants."
tags: [load-balancing, algorithms, traffic, routing]
related: [load-balancing-fundamentals, layer-4-vs-layer-7-load-balancing, consistent-hashing]
---
> **In one line:** Load balancing algorithms decide which server receives the next request based on rotation, current load, server capacity, or request hashing.

## The idea
When a load balancer receives a client connection, it must decide which server in the backend pool should process it. The choice of algorithm determines whether workload is distributed smoothly or whether individual nodes become overloaded while others sit idle.

The standard load balancing algorithms include:
1. **Round Robin:** Sequentially cycles through the list of available servers: server 1, server 2, server 3, and back to server 1. It assumes all servers have identical hardware capacity and that all requests take roughly equal time to process.
2. **Weighted Round Robin:** Assigns a weight integer to each server corresponding to its processing capacity. A powerful 32-core server might have a weight of 4, while an 8-core server has a weight of 1. The balancer sends 4 requests to the larger server for every 1 sent to the smaller server.
3. **Least Connections:** Dynamically directs traffic to the server currently maintaining the fewest active concurrent connections. This is superior when request durations vary widely (e.g., fast database cache reads versus slow 30-second analytical report exports), preventing slow requests from accumulating on a single node.
4. **Weighted Least Connections:** Combines connection counting with capacity weighting, directing requests to the node with the lowest ratio of active connections to assigned capacity.
5. **IP Hash (Source IP Hashing):** Hashes the client's IP address (e.g., `hash(client_ip) % N`) to select the backend server. This guarantees that requests from a specific client consistently land on the same backend node, naturally providing session affinity (sticky sessions) without storing central state.

## See it
Compare common load balancing algorithms across system characteristics:

| Algorithm | State Tracking Required? | Handles Heterogeneous Hardware? | Best Workload Type |
|---|---|---|---|
| **Round Robin** | Stateless (simple index counter) | Poorly (treats all nodes as identical) | Uniform, short-lived stateless requests |
| **Weighted Round Robin** | Stateless | Well (routes by assigned static weights) | Uniform requests on mixed-size server instances |
| **Least Connections** | Stateful (tracks active TCP connections) | Poorly | Varied request durations (e.g. streaming, long reports) |
| **IP Hash** | Stateless | Poorly | Applications requiring session persistence / local caching |
| **Consistent Hashing** | Ring topology state | Well with virtual nodes | Distributed caching layers, avoiding cache flushes |

```text
Round Robin Flow (Uniform requests):
Req 1 -> [App Server A]
Req 2 -> [App Server B]
Req 3 -> [App Server C]
Req 4 -> [App Server A]

Least Connections Flow (Varied durations):
Server A: 12 active connections
Server B: 4 active connections  <-- Req routed here!
Server C: 19 active connections
```

```yaml
# HAProxy algorithm selection snippet
backend dynamic_api_pool
  # Directs requests to server with fewest active connections
  balance leastconn
  server app1 10.0.1.11:8080 check maxconn 200
  server app2 10.0.1.12:8080 check maxconn 200
```

> **Watch out:** Plain IP Hashing breaks down when thousands of users sit behind a corporate NAT gateway or university proxy; all thousands of users share a single public IP address and get dumped onto one overloaded server!

## Go deeper
The "Power of Two Random Choices" algorithm (Michael Mitzenmacher) provides a brilliant randomized approach. Rather than querying all $N$ servers to find the least loaded, the load balancer randomly selects two servers and picks the one with fewer active connections. Mathematically, this simple randomized check achieves load balancing nearly identical to full least-connections with zero coordination overhead.
## Watch out
- Do not use Round Robin if request processing times vary significantly; fast nodes will sit idle while slow nodes choke.
- Be cautious with IP hashing when clients connect through corporate network gateways or mobile carrier proxy IPs.
## Remember
- Round Robin works well for uniform, fast requests; Least Connections is ideal when request durations vary widely.
- Weighted variants allow safe traffic distribution across heterogeneous hardware instance sizes.
- The "Power of Two Random Choices" delivers near-optimal least-connection performance with minimal state tracking.
