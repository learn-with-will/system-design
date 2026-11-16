---
slug: layer-4-vs-layer-7-load-balancing
title: "Layer 4 vs Layer 7 Load Balancing"
topic: scaling-and-traffic
kind: technique
summary: "Compare transport-layer packet routing (IP/port) with application-layer HTTP routing (headers/paths/cookies)."
tags: [load-balancing, layer4, layer7, networking]
related: [load-balancing-fundamentals, load-balancing-algorithms, reverse-proxies-and-ssl-termination]
---
> **In one line:** Layer 4 balancers route packets rapidly based on IP and port without inspecting content; Layer 7 balancers route based on HTTP headers, URLs, and cookies.

## The idea
Load balancers operate at different layers of the OSI network stack. The two primary paradigms are Layer 4 (Transport Layer) and Layer 7 (Application Layer) load balancing.

**Layer 4 Load Balancing (Transport Layer):**
A Layer 4 balancer routes traffic based strictly on network protocol information: source IP, source port, destination IP, destination port, and protocol (TCP or UDP). It treats the payload as an opaque stream of bytes. Because a Layer 4 balancer does not inspect or decrypt application data, it requires minimal CPU cycles and memory per connection. It simply performs Network Address Translation (NAT) or Direct Server Return (DSR), forwarding packets directly to backend servers. Layer 4 balancers achieve astonishing throughput (millions of packets per second per node), making them ideal as the first-tier entrance to large datacenters.

**Layer 7 Load Balancing (Application Layer):**
A Layer 7 balancer terminates the TCP connection, decrypts the TLS layer, and inspects the actual application protocol (typically HTTP/HTTPS, gRPC, or WebSockets). Because it parses the application message, it can make sophisticated routing decisions:
- Route requests matching `/api/checkout` to a high-memory checkout cluster, and `/images/*` to a storage cache cluster.
- Inspect HTTP headers, such as routing requests with `Authorization: Bearer test-user` to a canary deployment.
- Direct mobile clients based on User-Agent headers or route users based on session cookies.
The trade-off is computational cost: decrypting TLS, maintaining dual TCP connections (client-to-LB and LB-to-backend), and buffering HTTP headers consumes substantially more CPU and memory.

## See it
Compare the routing capabilities and performance trade-offs:

| Feature Dimension | Layer 4 Load Balancer | Layer 7 Load Balancer |
|---|---|---|
| **OSI Layer** | Layer 4 (Transport: TCP/UDP) | Layer 7 (Application: HTTP, gRPC) |
| **Inspection Data** | IP addresses and TCP/UDP ports only | Full HTTP payload: URLs, headers, cookies |
| **Content-Based Routing** | Impossible (payload is opaque) | Native (route by path, header, cookie) |
| **TLS Decryption** | Pass-through (or basic SNI routing) | Full TLS termination & certificate management |
| **Throughput & Speed** | Extremely high; wire-speed packet forwarding | Lower throughput; bounded by CPU/TLS parsing |
| **Example Technologies** | AWS NLB, Linux IPVS, HAProxy (mode TCP) | AWS ALB, NGINX, Envoy, HAProxy (mode HTTP) |

```yaml
# NGINX Layer 7 content-based routing configuration
http {
  upstream auth_service { server 10.0.1.10:8080; }
  upstream catalog_service { server 10.0.1.20:8080; }
  upstream static_storage { server 10.0.1.30:8080; }

  server {
    listen 443 ssl;
    server_name api.example.com;

    location /api/v1/auth {
      proxy_pass http://auth_service;
    }
    location /api/v1/products {
      proxy_pass http://catalog_service;
    }
    location /static/ {
      proxy_pass http://static_storage;
    }
  }
}
```

> **Tip:** Modern enterprise architectures frequently combine both: a high-throughput Layer 4 balancer (like AWS NLB) receives incoming internet traffic and distributes TCP connections across a tier of auto-scaling Layer 7 proxies (Envoy or NGINX) that perform TLS termination and microservice routing.

## Go deeper
Direct Server Return (DSR) is an advanced Layer 4 optimization. In standard load balancing, both incoming requests and outgoing responses traverse the balancer. However, web traffic is asymmetric: HTTP requests are small (1–2 KB), while HTTP responses (images, videos, HTML) are large (megabytes). In DSR, the load balancer rewrites the destination MAC address to forward incoming packets to the backend server, and the backend server replies *directly* to the client over its own internet gateway, bypassing the load balancer completely.
## Watch out
- Do not use Layer 7 load balancing for raw TCP protocols (like database connections or MQTT) where HTTP header parsing is irrelevant.
- Remember that terminating TLS at a Layer 7 load balancer leaves traffic between the balancer and backend servers unencrypted unless re-encrypted.
## Remember
- Layer 4 balances packets based on IP and port; Layer 7 balances requests based on HTTP headers, URLs, and cookies.
- Layer 4 provides maximum throughput and minimal latency; Layer 7 enables sophisticated content-based routing.
- Large systems chain both: Layer 4 for ingress traffic distribution, Layer 7 for microservice routing.
