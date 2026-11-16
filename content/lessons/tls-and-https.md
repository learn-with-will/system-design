---
slug: tls-and-https
title: "TLS & HTTPS"
topic: networking-and-apis
kind: concept
summary: "Master the TLS 1.3 cryptographic handshake, certificate authorities, symmetric encryption, and forward secrecy."
tags: [security, tls, https, cryptography]
related: [tcp-vs-udp, dns-resolution, encryption-in-transit-and-at-rest]
---
> **In one line:** TLS encrypts application traffic, authenticates server identity via X.509 certificates, and ensures forward secrecy in a single round trip.

## The idea
Plaintext HTTP transmits data in cleartext across the public Internet, leaving credentials and sensitive payloads vulnerable to eavesdropping, packet tampering, and man-in-the-middle (MitM) attacks. **Transport Layer Security (TLS)**—the cryptographic protocol underlying **HTTPS**—solves this by establishing an encrypted, authenticated, and tamper-proof tunnel between client and server.

Every modern web application relies on TLS to secure sensitive credit cards, passwords, session tokens, and personal data. Without TLS, anyone on the same public Wi-Fi network or intermediate router can inspect and modify request bodies in flight.
Plaintext HTTP transmits data in cleartext across the public Internet, leaving credentials and sensitive payloads vulnerable to eavesdropping, packet tampering, and man-in-the-middle (MitM) attacks. **Transport Layer Security (TLS)**—the protocol underlying **HTTPS**—solves this by establishing an encrypted, authenticated, and tamper-proof tunnel between client and server.

TLS provides three fundamental guarantees:
1. **Confidentiality (Encryption):** Adversaries intercepting packets see only unreadable ciphertext.
2. **Authentication (Identity):** The client verifies that the server is genuinely who it claims to be, backed by a cryptographic chain of trust rooted in trusted Certificate Authorities (CAs).
3. **Integrity (Anti-tampering):** Message Authentication Codes (MACs) ensure packets cannot be altered or injected in transit without detection.

Historically, TLS 1.2 added significant latency: two full network round trips (2-RTT) on top of TCP's initial 1-RTT handshake. **TLS 1.3** (standardized in RFC 8446) fundamentally modernized web security by cutting handshake latency to a single round trip (1-RTT) and introducing 0-RTT session resumption. Furthermore, TLS 1.3 removed legacy, insecure cipher suites, mandating ephemeral Diffie-Hellman key exchanges (ECDHE) to guarantee **Forward Secrecy**: even if a server's long-term private key is compromised in the future, past recorded sessions cannot be decrypted.

## See it
Trace the streamlined TLS 1.3 handshake compared to application data flow:

```sequence
actor client: Client
actor server: Server @blue
client -> server: ClientHello | Key Share, Supported Ciphers
server --> client: ServerHello | Server Key Share, Certificate, Finished
note client..server: Keys derived independently; symmetric cipher active
client -> server: Finished & HTTP GET /api/v1/user | Encrypted Payload
server --> client: HTTP 200 OK | Encrypted Response
```

```bash
# Inspecting TLS certificate and handshake parameters with OpenSSL
openssl s_client -connect api.example.com:443 -tls1_3

# Key parameters extracted from handshake:
# Protocol: TLSv1.3
# Cipher: TLS_AES_256_GCM_SHA384
# Verification: OK (Certificate Chain Valid)
# Key Exchange: ECDH, X25519 (Forward Secrecy enabled)
```

> **Note:** The entire cryptographic negotiation—agreeing on ciphers, verifying certificates, and computing symmetric session keys—occurs in just one round-trip exchange.

## Go deeper
Modern TLS relies on **hybrid encryption**. Asymmetric cryptography (RSA or elliptic-curve cryptography) is computationally expensive, so it is used exclusively during the handshake to authenticate identity and establish a shared secret. Once established, high-performance symmetric ciphers (AES-GCM or ChaCha20-Poly1305) encrypt application traffic at gigabit line speeds using dedicated CPU hardware instructions (AES-NI).
## Watch out
- Do not disable certificate verification in production services or internal microservice clients; this completely neutralizes TLS protection.
- Remember that TLS encrypts data in transit, not at rest; data stored in databases or log files remains readable unless separately encrypted.
## Remember
- TLS guarantees confidentiality (encryption), authentication (certificates), and data integrity.
- TLS 1.3 completes the cryptographic handshake in a single round trip (1-RTT).
- Forward Secrecy ensures that compromising a server private key does not compromise previously recorded encrypted sessions.
