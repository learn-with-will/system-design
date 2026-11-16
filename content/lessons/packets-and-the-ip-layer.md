---
slug: packets-and-the-ip-layer
title: "Packets & the IP Layer"
topic: networking-and-apis
kind: concept
summary: "Understand packet switching, IP routing, MTU limits, and best-effort delivery across the Internet."
tags: [networking, ip, packets, routing]
related: [tcp-vs-udp, dns-resolution, content-delivery-networks]
---
> **In one line:** The Internet Protocol (IP) breaks data into packets and routes them across networks on a best-effort, connectionless basis.

## The idea
The foundation of global computer networking is packet switching. Unlike legacy circuit-switched telephone networks that reserved a dedicated physical wire for the duration of a call, the Internet breaks data streams into independent discrete envelopes called **packets**.

The **Internet Protocol (IP)**, operating at Layer 3 of the OSI model, provides logical addressing (IPv4 32-bit addresses, IPv6 128-bit addresses) and determines how packets traverse intermediate routers to reach their destination. However, the IP layer provides only **best-effort delivery**:
1. Packets may arrive out of order because different packets take different physical paths across the Internet.
2. Packets may be dropped if an intermediate router's queue overflows with congested traffic.
3. Packets may be duplicated if link-level retransmissions occur.

Every physical network link has a **Maximum Transmission Unit (MTU)**, which is the largest packet size that can traverse that link without fragmentation. The standard MTU on the public Internet is **1,500 bytes**. An IP packet consists of a 20-byte IP header and up to 1,480 bytes of payload. If an application attempts to transmit a packet larger than the MTU over a path that prohibits fragmentation, the router drops the packet and sends an ICMP error, causing difficult-to-debug black hole connections.

## See it
Consider the structure of an IPv4 packet navigating intermediate hops:

```flow
src: Sender Host | App data chunked @primary
r1: Edge Router | Examines IP header @blue
r2: Core Transit Router | BGP routing table @blue
dst: Destination Host | Reassembles packets @green
src -> r1: Packet (1500 B MTU)
r1 -> r2: Dynamic path routing
r2 -> dst: Final link delivery
```

```bash
# Inspecting packet routing hops and latency with traceroute
traceroute -n -m 10 8.8.8.8

# Sample hop inspection:
# 1  192.168.1.1    1.24 ms  (Local Gateway)
# 2  10.240.0.1     4.12 ms  (ISP Aggregation)
# 3  172.25.14.88   8.45 ms  (Regional Core)
# 4  8.8.8.8       12.10 ms  (Destination Anycast)
```

> **Tip:** In distributed system design, assume that the network is fundamentally unreliable. Disconnects, packet loss, and latency jitter are standard operational conditions, not rare anomalies.

## Go deeper
Path MTU Discovery (PMTUD) is used by modern hosts to determine the smallest MTU along an end-to-end network path. The sending host sets the "Don't Fragment" (DF) bit in the IP header. If a packet is too large for an intermediate hop, the router drops it and replies with an ICMP "Fragmentation Needed" message containing that link's MTU, allowing the sender to scale down packet sizes.
## Watch out
- Never assume that packets arrive in the order they were sent; order reassembly is the responsibility of Layer 4 (TCP).
- Misconfigured firewalls that block ICMP traffic break Path MTU Discovery, causing connections to hang when transmitting large responses.
## Remember
- The IP layer is connectionless, unordered, and provides only best-effort delivery.
- The standard public Internet MTU is 1,500 bytes; exceeding link MTU causes fragmentation or dropped packets.
- Software architectures must handle network unreliability, packet loss, and variable latency at the application layer.
