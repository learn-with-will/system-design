---
id: lesson-23
slug: security-essentials
title: "Security Essentials"
level: advanced
order: 23
duration: 26
tags:
  - security
  - authentication
  - authorization
  - oauth
  - encryption
---

# Learning Objectives

By the end of this lesson you will be able to:

- Tell **authentication** apart from **authorization**.
- Explain **encryption in transit** and **at rest**.
- Describe what **OAuth 2.0** and **OpenID Connect** are for.
- Apply **least privilege** and **defense in depth**.
- Avoid common security mistakes (plaintext passwords, injection, hardcoded secrets).

# Why It Matters

A system can be fast, scalable, and reliable — and still be a disaster if it leaks user data
or lets attackers in. Security isn't a feature you bolt on at the end; it's a set of design
decisions that run through the whole system. This lesson covers the essentials every
designer must get right, and the classic mistakes to avoid.

# Concept Explanation

### Authentication vs authorization

These are constantly confused but distinct:

- **Authentication (authN)** — **who are you?** Verifying identity: a password, a token, a
  passkey, a certificate.
- **Authorization (authZ)** — **what are you allowed to do?** Checking permissions: can *this*
  user delete *this* record?

You authenticate **first** (establish identity), then authorize **each action** (check
permission). A logged-in user is authenticated; that doesn't mean they may access another
user's data — that's an authorization check, and forgetting it is one of the most common and
serious bugs (broken access control).

### Encryption in transit and at rest

- **In transit:** use **TLS** (Lesson 4) so data crossing the network is encrypted — no
  plaintext passwords or tokens on the wire. HTTPS everywhere.
- **At rest:** encrypt stored data (databases, disks, backups) so a stolen disk or leaked
  backup doesn't expose it.

Encryption protects **confidentiality** (and, with the right schemes, integrity). Don't
invent your own crypto — use standard, vetted libraries and protocols.

### Passwords and secrets

- **Never store passwords in plaintext.** Store a **salted hash** using a slow, purpose-built
  algorithm (such as bcrypt, scrypt, or Argon2). The salt (a per-user random value) stops
  precomputed-hash attacks; slowness makes brute force expensive.
- **Never hardcode secrets** (API keys, DB passwords) in code or commit them to git. Use a
  **secrets manager**/vault, inject them at runtime, and **rotate** them.

### OAuth 2.0 and OpenID Connect

Two standards you'll meet constantly — and they do different jobs:

- **OAuth 2.0** (RFC 6749) is an **authorization** framework for **delegated access**. It
  lets a user grant an application limited access to their data on another service **without
  sharing their password** — via a scoped **access token**. Its roles: the **resource owner**
  (user), the **client** (the app), the **authorization server** (issues tokens), and the
  **resource server** (holds the data). "Log in and let this app read your calendar" is
  OAuth.
- **OpenID Connect (OIDC)** is an **authentication** layer built **on top of** OAuth 2.0. It
  adds an **ID token** that proves **who the user is** — which is what "Sign in with ___"
  buttons use. Remember: **OAuth = authorization/delegation; OIDC = authentication (identity)
  on top of it.**

A **JWT (JSON Web Token)** is a common **token format** used to carry claims (like the user
id and scopes), **signed** so the server can verify it wasn't tampered with. Note a signed
JWT is **readable** (base64), not encrypted — never put secrets in one — and it enables
**stateless** auth because the server can verify it without a session lookup (Lesson 9).

### Principle of least privilege

Grant every user, service, and credential the **minimum** permissions needed — and nothing
more. A reporting service that only reads should have read-only database access; a
compromised component with least privilege can do far less damage.

### Defense in depth

Don't rely on a single wall. **Defense in depth** layers independent controls — network
boundaries, authentication, authorization, input validation, encryption, rate limiting,
monitoring — so that if one fails, others still protect the system. Related is **zero
trust**: don't trust a request just because it came from "inside"; verify identity and
permissions on every request.

### Common threats (a taste of OWASP)

The **OWASP Top 10** catalogs the most common web risks. A few essentials:

- **Broken access control** — missing authorization checks; the most common serious flaw.
  Enforce authZ on **every** request server-side.
- **Injection** (e.g. SQL injection) — untrusted input treated as code. Prevent with
  **parameterized queries** and input validation; never concatenate user input into a query.
- **Cross-site scripting (XSS)** — injecting scripts into pages; escape/encode output.
- Use **rate limiting** and a WAF to blunt brute-force and abuse (Lesson 16).

# Key Terminology

- **Authentication (authN)** — verifying who a user is.
- **Authorization (authZ)** — checking what a user is allowed to do.
- **Encryption in transit / at rest** — protecting data on the network / in storage.
- **Salted hash** — a password stored as a slow hash with a per-user random salt.
- **OAuth 2.0** — an authorization framework for delegated, scoped access via tokens.
- **OpenID Connect (OIDC)** — an authentication layer on top of OAuth 2.0 (ID tokens).
- **JWT** — a signed token format carrying claims; readable, not encrypted.
- **Least privilege** — granting the minimum permissions necessary.
- **Defense in depth** — layered, independent security controls.

# Options and Trade-offs

| Concern | Do this | Not this |
| ------- | ------- | -------- |
| Identity | Authenticate, then authorize each action | Assume "logged in" means "allowed" |
| Passwords | Salted slow hash (bcrypt/Argon2) | Plaintext or fast unsalted hashes |
| Secrets | Secrets manager, rotated | Hardcoded in code or git |
| Data on the wire | TLS everywhere | Plaintext HTTP |
| Queries | Parameterized queries | String-concatenated SQL |
| Access | Least privilege | Broad "admin" credentials everywhere |

# Worked Example

Design authentication and authorization for an app where users store private notes and can
grant a third-party app read-only access to them.

```text
  1. AuthN (who): users log in over TLS; passwords stored as salted Argon2 hashes.
     Issue a signed session token (e.g. a JWT) so servers stay stateless.
  2. AuthZ (what): on EVERY request, check the note belongs to the authenticated user
     before returning or modifying it (prevent broken access control).
  3. Delegated access: the third-party app uses OAuth 2.0 -- the user approves a
     read-only "notes:read" scope, and the app gets a scoped access token, never the
     password.
  4. Defense in depth: TLS in transit, encryption at rest, rate limiting on login
     (brute-force), parameterized queries, least-privilege DB credentials, and audit logs.
```

Notice how the pieces layer: authentication establishes identity, per-request authorization
enforces ownership, OAuth handles delegation **without** sharing passwords, and multiple
independent controls mean one failure isn't game over. That layering — not any single
control — is what makes the design secure.

# Real World Analogy

Security is like a secure building. **Authentication** is the ID check at the front desk
(who are you?). **Authorization** is your keycard only opening the floors you're allowed on
(what may you do?). **Encryption in transit** is a sealed courier pouch between buildings;
**at rest** is a locked safe inside. **OAuth** is giving a contractor a **temporary,
limited** badge for one room instead of your master key. **Defense in depth** is having a
fence, a lock, a guard, *and* cameras — so one failure doesn't hand over the building. And
**least privilege** is not giving the intern the master key "just in case."

# Examples

## Example 1 — Basic: hashing passwords

A signup flow stores each password as a salted Argon2 hash. A later database leak exposes
hashes, not passwords, and the slow hash makes cracking them impractical.

**Why this works:** salting defeats precomputed tables and slow hashing makes brute force
expensive, so a leak is far less catastrophic.

## Example 2 — Real-world: OAuth for third-party access

A user connects a budgeting app to their bank via OAuth. The bank issues a read-only,
scoped token; the app never sees the user's banking password and access can be revoked.

**Why this works:** OAuth delegates limited access with a scoped token, so the third party
gets exactly what it needs and nothing more.

## Example 3 — Trade-off / pitfall: missing authorization check

An API authenticates users but fetches a record by id **without checking ownership**. Any
logged-in user can read anyone's data by changing the id in the URL (broken access control).

**Why this bites:** authentication is not authorization. Every request must verify the user
is allowed to access that specific resource, server-side.

# Common Mistakes

- **Confusing authN and authZ.** Being logged in doesn't mean being permitted; check
  authorization on every action.
- **Storing passwords in plaintext or with fast unsalted hashes.** Use salted bcrypt/scrypt/
  Argon2.
- **Hardcoding secrets** in code or committing them to git. Use a secrets manager and rotate.
- **Building queries by string concatenation** (SQL injection). Use parameterized queries.
- **Rolling your own crypto** or auth. Use standard, vetted libraries and protocols.
- **Trusting "internal" requests.** Verify every request (zero trust); attackers get inside.

# Best Practices

- **Authenticate, then authorize every action** server-side (never trust the client).
- **TLS everywhere**, and **encrypt sensitive data at rest**.
- **Hash passwords** with a salted, slow algorithm; **manage and rotate secrets** properly.
- **Use OAuth 2.0 / OIDC** for delegated access and identity rather than inventing your own.
- **Apply least privilege** to users, services, and credentials, and **layer controls**
  (defense in depth).
- **Follow OWASP guidance** and keep dependencies patched.

# Summary

- **Authentication** verifies **who** you are; **authorization** checks **what** you may do —
  and you must authorize **every** action, not just authenticate once.
- Encrypt data **in transit** (TLS) and **at rest**; **hash passwords** with a salted, slow
  algorithm; keep secrets in a **manager**, not in code.
- **OAuth 2.0** grants delegated, scoped access without sharing passwords; **OpenID Connect**
  adds authentication (identity) on top; a **JWT** is a signed, readable token format.
- Apply **least privilege** and **defense in depth**, and guard against OWASP classics like
  broken access control and injection.
- Don't roll your own crypto or auth — use standard, vetted building blocks.

# Flash Cards

Q: What is the difference between authentication and authorization?
A: Authentication verifies who you are (identity); authorization checks what you're allowed to do (permissions). You authenticate once, then authorize every action.

Q: How should passwords be stored?
A: As a salted hash using a slow, purpose-built algorithm (bcrypt, scrypt, or Argon2) — never in plaintext or with fast unsalted hashes.

Q: What is OAuth 2.0 for, and how does OpenID Connect relate to it?
A: OAuth 2.0 is an authorization framework for delegated, scoped access via tokens (without sharing passwords). OpenID Connect is an authentication layer on top of OAuth 2.0 that adds an ID token proving who the user is.

Q: Is a signed JWT encrypted?
A: No — a signed JWT is readable (base64-encoded) and only tamper-evident, not secret. Never put confidential data in one.

Q: What is the principle of least privilege?
A: Granting every user, service, and credential the minimum permissions needed and nothing more, so a compromise does less damage.

Q: What is 'broken access control,' and how do you prevent it?
A: Failing to check that a user is authorized for the specific resource they request (e.g., reading another user's record by changing an id). Prevent it by enforcing authorization on every request, server-side.

# Exercises

### Easy
Classify each as authentication or authorization: (a) verifying a password, (b) checking that
a user owns the document they're editing, (c) validating a "Sign in with Google" ID token,
(d) confirming a user has the "admin" role.

### Medium
Explain why authenticating a user is not enough to safely return a record by id. Describe the
missing check and where it must happen.

### Challenging
Design the security for an API that lets users store files and share read-only links with
third-party apps. Cover authentication, per-request authorization, encryption, secret
management, delegated access (OAuth), and two defense-in-depth layers. Name one OWASP risk you
are specifically mitigating and how.

# Further Reading

- OWASP — the OWASP Top 10 and Cheat Sheet Series: https://owasp.org/
- IETF RFC 6749 — "The OAuth 2.0 Authorization Framework"; OpenID Connect Core —
  https://openid.net/connect/
