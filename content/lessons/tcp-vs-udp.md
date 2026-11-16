---
slug: tcp-vs-udp
title: "TCP vs UDP"
topic: networking-and-apis
kind: concept
summary: "Compare connection-oriented reliable TCP with low-latency connectionless UDP across real-world workloads."
tags: [networking, tcp, udp, transport-layer]
related: [packets-and-the-ip-layer, tls-and-https, rest-and-resource-modeling]
---
> **In one line:** TCP provides reliable, ordered byte streams via handshakes and retransmissions; UDP provides lightweight, unordered datagrams with minimal overhead.

## The idea
Operating directly on top of the IP layer are the two foundational Layer 4 transport protocols: the **Transmission Control Protocol (TCP)** and the **User Datagram Protocol (UDP)**. The choice between them represents one of the most classic trade-offs in distributed systems: guaranteed reliability versus low latency.

**TCP** is a connection-oriented protocol that transforms the lossy, unordered IP packet layer into a continuous, reliable byte stream. TCP guarantees that every byte sent is received in exact order without duplicates. It accomplishes this through a three-way handshake (SYN, SYN-ACK, ACK), sequence numbers, positive acknowledgments, checksums, and automatic retransmissions. Furthermore, TCP incorporates **flow control** (ensuring a fast sender does not overwhelm a slow receiver via sliding receive windows) and **congestion control** (dynamically probing network capacity to prevent packet collapse on congested links). The downside is latency: establishing a connection requires a full round trip, and packet loss triggers **head-of-line (HoL) blocking**, stalling subsequent bytes until the missing packet is retransmitted.

**UDP** is a connectionless, minimal datagram protocol. It adds only an 8-byte header containing source port, destination port, length, and an optional checksum. UDP does not perform handshakes, does not track sequence numbers, does not acknowledge delivery, and does not retransmit lost packets. If a packet is dropped, it is lost forever. In exchange, UDP has zero connection setup latency, no head-of-line blocking, and minimal protocol overhead. It is the protocol of choice for DNS lookups, real-time audio/video streaming, online gaming, and modern QUIC / HTTP/3.

## See it
Compare the mechanisms and performance trade-offs of TCP and UDP:

| Feature Dimension | Transmission Control Protocol (TCP) | User Datagram Protocol (UDP) |
|---|---|---|
| **Connection State** | Connection-oriented (3-way handshake) | Connectionless (fire and forget) |
| **Delivery Guarantee** | Guaranteed delivery via retransmissions | Best-effort; dropped packets are lost |
| **Ordering** | Strictly in-order byte stream | Unordered discrete datagrams |
| **Flow & Congestion Control** | Built-in (AIMD, BBR, Cubic) | None; application must manage bandwidth |
| **Header Size** | 20–60 bytes | Exactly 8 bytes |
| **Primary Use Cases** | Web (HTTP/1.1, HTTP/2), database connections, email | DNS, VoIP, video conferencing, HTTP/3 (QUIC) |

```sequence
actor client: Client
actor server: Server @blue
client -> server: SYN (Seq=X)
server --> client: SYN-ACK (Seq=Y, Ack=X+1)
client -> server: ACK (Ack=Y+1) | Established
client -> server: HTTP Request
server --> client: HTTP Response
```

```bash
# Testing TCP handshake vs UDP packet delivery via netcat
nc -z -v -w 2 198.51.100.24 443   # TCP: Verifies 3-way handshake on port 443
nc -u -z -v 198.51.100.24 53      # UDP: Sends single datagram on DNS port 53
```

> **Note:** Notice that TCP requires 1.5 round trips (SYN, SYN-ACK, ACK) before application payload can be transmitted. When combined with TLS, this handshake latency historically dominated web connection setup.

## Go deeper
HTTP/3 replaces TCP with QUIC, a transport protocol built on top of UDP. By implementing multiplexed streams inside user space over UDP, QUIC eliminates TCP's head-of-line blocking (packet loss on one CSS file does not stall a concurrent JavaScript download) and enables 0-RTT connection resumption.
## Watch out
- Do not choose TCP for real-time multiplayer gaming or voice streaming; retransmitting a dropped audio sample 200ms later is useless.
- Remember that UDP applications must implement their own rate limiting; flooding a network with UDP can induce self-inflicted packet loss.
## Remember
- TCP guarantees reliable, ordered byte streams but introduces connection setup and head-of-line blocking.
- UDP delivers unordered datagrams with minimal overhead, ideal for real-time and loss-tolerant protocols.
- Modern HTTP/3 uses QUIC over UDP to eliminate TCP head-of-line blocking while maintaining reliability.
