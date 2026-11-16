---
slug: dns-resolution
title: "DNS Resolution"
topic: networking-and-apis
kind: concept
summary: "Trace hierarchical DNS lookups across root, TLD, and authoritative servers with Anycast and TTL caching."
tags: [dns, networking, anycast, infrastructure]
related: [packets-and-the-ip-layer, content-delivery-networks, load-balancing-fundamentals]
---
> **In one line:** The Domain Name System (DNS) translates human-readable hostnames into IP addresses through a hierarchical, globally cached lookup tree.

## The idea
Every internet interaction begins with a domain name like `api.example.com`. Because routers navigate using IP addresses, the system must first resolve that human-readable name into an IPv4 or IPv6 destination. The **Domain Name System (DNS)** is a globally distributed, hierarchical key-value database that performs this translation.

The DNS hierarchy consists of four primary tiers:
1. **Recursive Resolver:** Typically operated by the user's ISP or public DNS providers (like Cloudflare 1.1.1.1 or Google 8.8.8.8). It receives the client's query and performs the iterative legwork across the global hierarchy.
2. **Root Name Servers:** 13 logical root server addresses (operated across hundreds of physical Anycast locations globally) that direct resolvers to the appropriate Top-Level Domain (TLD) servers.
3. **TLD Name Servers:** Manage top-level domains like `.com`, `.org`, and country codes (`.uk`, `.de`). They point the resolver to the authoritative servers for specific registered domains.
4. **Authoritative Name Servers:** The definitive source of truth configured by the domain owner. They store the actual DNS records (A, AAAA, CNAME, MX, TXT) and return the final IP address.

To avoid traversing this entire tree on every web request, DNS relies heavily on **caching**. Every DNS record carries a **Time to Live (TTL)** in seconds. Intermediate resolvers cache responses for the TTL duration. If a TTL is set to 86,400 seconds (24 hours), changes to your server's IP address will take up to 24 hours to propagate across global resolvers.

## See it
Trace the complete recursive DNS resolution flow for a cache-miss lookup:

```sequence
actor client: Browser | Client OS @neutral
actor resolver: Recursive Resolver | 1.1.1.1 @primary
actor root: Root Server (.) | Root zone @blue
actor tld: TLD Server | .com zone @blue
actor auth: Authoritative NS | example.com @green
client -> resolver: Lookup api.example.com
resolver -> root: Query .com NS
root --> resolver: .com NS addresses
resolver -> tld: Query example.com NS
tld --> resolver: example.com NS addresses
resolver -> auth: Query api.example.com A
auth --> resolver: 198.51.100.24 (TTL 300)
resolver --> client: 198.51.100.24 | Cached for 300s
```

```bash
# Querying authoritative DNS records with dig
dig +trace api.example.com A

# Querying specific record and inspecting TTL:
dig @1.1.1.1 api.example.com A +noall +answer
# Output:
# api.example.com.    300    IN    A    198.51.100.24
```

> **Tip:** Authoritative DNS servers utilize **Anycast routing**, where multiple physical servers across the globe announce the same IP address via BGP. BGP automatically routes each query to the topologically nearest physical datacenter.

## Go deeper
DNS can also function as a global traffic router through **GeoDNS** and **Latency-based routing**. When an authoritative name server receives a query, it inspects the client resolver's IP address (or the client subnet via EDNS-Client-Subnet) and dynamically returns the IP address of the datacenter closest to that user.
## Watch out
- Do not set DNS TTL to zero during normal operations; this eliminates resolver caching and overloads authoritative servers.
- Before a major IP migration, lower the DNS TTL to 300 seconds several days in advance to ensure rapid client cutover.
## Remember
- DNS resolves names via a hierarchical tree: Recursive Resolver -> Root -> TLD -> Authoritative.
- Record TTL dictates how long resolvers cache IP mappings and how fast DNS updates propagate.
- GeoDNS and Anycast allow DNS to route traffic to the geographically nearest server cluster.
