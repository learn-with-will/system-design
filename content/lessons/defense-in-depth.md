---
slug: defense-in-depth
title: "Defense in Depth & Zero Trust"
topic: operations-and-security
kind: concept
summary: "Apply layered security principles and Zero Trust network architecture: never trust, always verify."
tags: [security, defense-in-depth, zero-trust, architecture]
related: [authentication-vs-authorization, oauth-2-and-openid-connect, encryption-in-transit-and-at-rest]
---
> **In one line:** Defense in depth implements redundant, layered security controls at every tier, while Zero Trust assumes the internal network is already hostile.

## The idea
Historically, enterprise network security followed the **Castle-and-Moat** perimeter model: build a hardened exterior firewall around the corporate network, and trust everything inside. Once an attacker (or a compromised laptop) breached the perimeter VPN or edge firewall, they enjoyed unrestricted lateral movement across internal databases and services.

Modern system design replaces this obsolete model with two foundational paradigms:

**1. Defense in Depth:**
Security is implemented in concentric, redundant layers. If an attacker breaches or bypasses one defensive barrier, subsequent independent layers prevent exploitation or contain the blast radius:
- *Edge Layer:* Cloudflare/WAF mitigating DDoS and SQL injection attacks.
- *Network Layer:* Private VPC subnets, strict Security Groups, and mutual TLS (mTLS).
- *Compute Layer:* Hardened container base images, least-privilege service accounts, read-only root filesystems.
- *Application Layer:* Input validation, parameterized SQL queries, rate limiting, and IDOR access checks.
- *Data Layer:* Encryption at rest, envelope encryption via KMS, and database audit logging.

**2. Zero Trust Architecture:**
Coined by John Kindervag, the core principle of Zero Trust is: **Never Trust, Always Verify**.
Zero Trust assumes that the internal network is fundamentally compromised and hostile. Being inside the private cloud VPC grants zero implicit trust:
- Every service-to-service call must authenticate itself using mutual TLS (mTLS).
- Every request must verify fine-grained authorization permissions.
- Network access is governed by the Principle of Least Privilege.

## See it
Compare the vulnerable Castle-and-Moat model against layered Defense in Depth:

```tree
Security Paradigms
  Castle-and-Moat (Vulnerable to Lateral Movement)
    Edge Firewall: Hardened @primary
    Internal Network: Plain HTTP, unauthenticated trust @red
    Database: Unencrypted, accessible by all internal nodes @red
  Defense in Depth & Zero Trust (Layered Security)
    [Edge] WAF, DDoS mitigation, TLS 1.3 termination @green
    [Network] Private isolated subnets, micro-segmentation @green
    [Transport] Mutual TLS (mTLS) between all microservices @green
    [Identity] JWT / OAuth 2.0 token verified at every hop @green
    [Application] Parameterized SQL, rate limiting, IDOR checks @green
    [Storage] Envelope encryption at rest, KMS key rotation @green
```

```yaml
# Kubernetes NetworkPolicy enforcing Zero Trust micro-segmentation
# Prohibits all incoming traffic to database pods EXCEPT from order-service!
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: db-access-policy
spec:
  podSelector:
    matchLabels:
      role: database
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: order-service # Strictly allows only order-service!
    ports:
    - protocol: TCP
      port: 5432
```

> **Tip:** Network segmentation policies prevent lateral movement. If an attacker compromises an auxiliary analytics pod, they cannot open a network socket to the primary customer database.

## Go deeper
**Insecure Direct Object References (IDOR):**
A common security failure occurs when an API authenticates a user but fails to verify authorization on specific object IDs:
`GET /api/v1/invoices/10492`
If changing the URL ID to `10493` returns another customer's private invoice, the system has an IDOR vulnerability. Defense in depth mandates that every data fetch query enforce tenant ownership: `WHERE id = :invoice_id AND organization_id = :current_user_org`.
## Watch out
- Never rely on a perimeter firewall as your sole security barrier; assume attackers can execute code within internal network pods.
- Do not trust internal service calls implicitly; verify authentication and authorization tokens on every inter-service hop.
## Remember
- Defense in depth deploys layered security controls across edge, network, app, and data tiers.
- Zero Trust assumes the internal network is hostile: never trust, always verify.
- Enforce least-privilege network segmentation to prevent attackers from moving laterally.
