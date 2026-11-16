---
slug: reverse-proxies-and-ssl-termination
title: "Reverse Proxies & SSL Termination"
topic: scaling-and-traffic
kind: tool
summary: "Offload TLS handshakes, compress responses with Brotli/Gzip, and protect origin backends using reverse proxies."
tags: [reverse-proxy, nginx, ssl, security]
related: [load-balancing-fundamentals, tls-and-https, rate-limiting-fundamentals]
---
> **In one line:** A reverse proxy sits in front of web servers to terminate SSL, compress responses, cache static assets, and shield internal topologies.

## The idea
In computer networking, a **forward proxy** sits in front of client devices (such as a corporate proxy intercepting outbound employee web traffic). A **reverse proxy**, by contrast, sits in front of backend servers, intercepting inbound requests on behalf of the application. To external clients, the reverse proxy appears as the origin web server.

Reverse proxies (such as NGINX, Envoy, Caddy, or Traefik) provide critical infrastructure services:
1. **SSL/TLS Termination:** Negotiating TLS handshakes, verifying certificates, and decrypting incoming HTTPS traffic is computationally expensive. A reverse proxy terminates TLS at the edge, relieving application runtimes (Node.js, Python, Ruby, Java) from cryptographic CPU overhead. Traffic within the secure private VPC can then travel over lightweight internal HTTP.
2. **Response Compression:** Automatically compresses text responses using Gzip or Brotli before transmitting them over the public Internet, slashing bandwidth consumption by 70%.
3. **Buffering Slow Clients:** If a client on a slow mobile connection takes five seconds to receive a 1 MB response, an application server thread would be held open for that entire duration. A reverse proxy buffers the entire response in memory and streams it slowly to the client, freeing the backend application server thread in milliseconds.
4. **Security and Obfuscation:** The reverse proxy hides the private IP addresses, operating systems, and internal topologies of backend services, presenting a single, hardened public entry point.

## See it
Consider how a reverse proxy insulates internal application servers:

```flow
client: Public Client | TLS 1.3 WAN @neutral
proxy: NGINX Reverse Proxy | SSL Termination & Brotli @primary
app: Node.js App Server | Plain HTTP on internal VPC @green
client -> proxy: HTTPS GET /api/data
proxy -> app: HTTP GET /api/data
```

```yaml
# Standard NGINX reverse proxy configuration
server {
  listen 443 ssl http2;
  server_name api.example.com;

  ssl_certificate /etc/ssl/certs/bundle.crt;
  ssl_certificate_key /etc/ssl/private/server.key;

  # Gzip and Brotli compression offloading
  gzip on;
  gzip_types application/json text/plain text/css;

  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

> **Tip:** Notice the `X-Forwarded-For` and `X-Forwarded-Proto` headers. When a reverse proxy terminates TLS, backend servers see the proxy's private IP as the remote address. These headers preserve the user's original IP and protocol for application logic and audit logs.

## Go deeper
In zero-trust security architectures (and compliance regimes like PCI-DSS or HIPAA), unencrypted traffic is forbidden even within private cloud VPCs. In these environments, reverse proxies perform **TLS Bridging**: the proxy terminates the public client TLS connection to inspect headers and filter attacks, and immediately establishes a new, internal TLS connection to the backend server.
## Watch out
- Always validate and trust only your own reverse proxies when reading the `X-Forwarded-For` header; untrusted clients can forge spoofed IPs.
- Ensure proxy buffer sizes are tuned; responses exceeding memory buffer limits spill to disk, inducing severe disk I/O penalties.
## Remember
- A reverse proxy shields origin servers, terminating TLS and compressing responses at the network edge.
- Reverse proxies buffer slow client connections, preventing application threads from being held hostage.
- Pass the `X-Forwarded-For` header so backend applications retain visibility into original client IP addresses.
