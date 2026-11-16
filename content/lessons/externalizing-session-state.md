---
slug: externalizing-session-state
title: "Externalizing Session State"
topic: scaling-and-traffic
kind: pattern
summary: "Manage user sessions at scale: centralized distributed cache vs stateless cryptographic JWT tokens."
tags: [sessions, redis, jwt, authentication]
related: [stateless-service-architecture, oauth-2-and-openid-connect, caching-fundamentals-and-tiers]
---
> **In one line:** Externalize session state either centrally via in-memory Redis clusters or client-side via cryptographically signed JWT tokens.

## The idea
In multi-server web applications, managing authenticated user sessions across requests is a foundational design challenge. When a user logs in on server A and subsequent requests route to server B, server B must verify the user's identity without querying the primary database on every single HTTP request.

There are two primary architectural patterns for externalizing session state:

1. **Centralized In-Memory Store (The Session Store Pattern):**
   When the user logs in, the application generates a cryptographically random session ID (a UUID), stores the user's profile and permissions in an in-memory key-value store (like Redis or Memcached) with an expiration TTL, and sets an `HttpOnly`, `Secure` cookie on the client containing only the session ID.
   - *Pros:* Instant revocation. If a user changes their password or is compromised, an administrator deletes the session key from Redis, immediately logging the user out globally.
   - *Cons:* Every single request requires an external network round trip to Redis.

2. **Client-Side Cryptographic Tokens (JSON Web Tokens - JWT):**
   When the user logs in, the server generates a JSON payload containing user claims (e.g., user ID, roles, expiration time), signs it with a secret HMAC key or RSA private key, and returns the signed JWT to the client. On subsequent requests, the client transmits the token in an `Authorization: Bearer <token>` header. Any application server can verify the signature mathematically using its shared secret key—zero database or Redis lookups required.
   - *Pros:* Completely stateless, zero network round trips to a session store, highly scalable across microservices.
   - *Cons:* Invalidation is difficult. Once a JWT is signed, it remains valid until its expiration timestamp unless you maintain a central revocation blocklist (which reintroduces state!).

## See it
Compare Centralized Redis Sessions with Stateless JWTs:

| Feature Dimension | Centralized Redis Session Store | Stateless JWT Tokens |
|---|---|---|
| **State Location** | Central in-memory Redis cluster | Encoded on the client device |
| **Verification Overhead** | Network call to Redis on every request | Local CPU signature verification (Zero network I/O) |
| **Instant Revocation** | Trivial (delete key `session:<id>` in Redis) | Hard (requires short TTLs or revocation blocklists) |
| **Payload Size** | Minimal (~36 byte UUID cookie) | Larger (several hundred bytes in HTTP headers) |
| **Data Synchronization** | Always fresh (updates reflect instantly) | Can become stale until token expires and refreshes |

```json
// Decoded JWT Payload (RFC 7519)
{
  "sub": "usr_9482",
  "name": "Alex Mercer",
  "roles": ["admin", "editor"],
  "iat": 1731787200,
  "exp": 1731790800,
  "iss": "auth.example.com"
}
```

```bash
# Inspecting active Redis session keys and TTL via CLI
redis-cli
> GET session:8a1b-4c2d-9e3f
# Output: "{"userId":"usr_9482","roles":["admin"]}"
> TTL session:8a1b-4c2d-9e3f
# Output: (integer) 3412 (seconds remaining)
```

> **Tip:** The industry standard compromise uses **Short-lived JWTs (15 minutes)** for fast, stateless API authentication, combined with **Long-lived Refresh Tokens (7 days)** stored securely in Redis for instant session revocation and rotation.

## Go deeper
If you store sensitive user attributes inside a JWT, remember that standard JWTs (JWS) are **signed, not encrypted**. Anyone who intercepts or decodes the base64 token can read all contained claims. Never store sensitive passwords, credit card details, or PII inside a standard JWT payload without JSON Web Encryption (JWE).
## Watch out
- Do not set JWT expiration times to months or years; a stolen token cannot be revoked without changing the signing secret globally.
- Never store session tokens in browser `localStorage` where they are vulnerable to cross-site scripting (XSS); use `HttpOnly` cookies.
## Remember
- Redis session stores allow instant revocation but require a network lookup per request.
- JWTs eliminate session lookup latency via cryptographic verification but complicate revocation.
- Combine short-lived JWT access tokens with revocable Redis refresh tokens for optimal security and performance.
