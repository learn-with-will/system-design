---
slug: authentication-vs-authorization
title: "Authentication vs Authorization"
topic: operations-and-security
kind: concept
summary: "Distinguish verifying identity (AuthN) from enforcing permissions (AuthZ) using RBAC and ABAC."
tags: [security, authentication, authorization, rbac, abac]
related: [defense-in-depth, oauth-2-and-openid-connect, encryption-in-transit-and-at-rest]
---
> **In one line:** Authentication verifies who a user is (identity); authorization verifies what actions that authenticated user is permitted to perform (permissions).

## The idea
In computer security, **Authentication (AuthN)** and **Authorization (AuthZ)** are two distinct, sequential phases of access control. Confusing the two leads to severe architectural vulnerabilities.

**1. Authentication (AuthN) — "Who are you?":**
Authentication is the process of verifying a client's claimed identity. The client provides credentials to prove they are who they claim to be:
- *Something you know:* Passwords, PINs.
- *Something you have:* TOTP authenticator app tokens, hardware security keys (FIDO2 / WebAuthn), SMS codes.
- *Something you are:* Biometrics (fingerprints, facial recognition).
Once authenticated, the system issues an identity artifact: a cryptographic session cookie or a signed JSON Web Token (JWT).

**2. Authorization (AuthZ) — "What are you allowed to do?":**
Authorization occurs *after* authentication is established. It determines whether the authenticated identity has permission to execute a specific action on a specific resource:
- *Can Alice view Invoice #9912?*
- *Can Bob delete the Production Database?*

Authorization is implemented using two primary access control models:
- **Role-Based Access Control (RBAC):** Permissions are assigned to broad roles (e.g., `Admin`, `Editor`, `Viewer`), and users are assigned to roles. Simple to administer, but rigid.
- **Attribute-Based Access Control (ABAC):** Evaluates dynamic attributes of the subject, resource, and environment (e.g., *"Allow access if user.department == resource.department AND request.time is during business hours AND client.is_corporate_vpn == true"*). Highly flexible and fine-grained.

## See it
Compare Authentication and Authorization across core characteristics:

| Dimension | Authentication (AuthN) | Authorization (AuthZ) |
|---|---|---|
| **Core Question** | Who is the user? (Identity verification) | What can the user do? (Permission check) |
| **Execution Order** | Executes first | Executes second (after identity is proven) |
| **Mechanisms** | Passwords, MFA, WebAuthn, OAuth, OIDC | RBAC, ABAC, ACLs, IAM policies |
| **Failure Code** | **HTTP 401 Unauthorized** (Actually "Unauthenticated") | **HTTP 403 Forbidden** (Identity known, but denied) |
| **Payload Artifact** | ID Token (OpenID Connect), session cookie | Scopes, permission claims, policy evaluation |

```json
// Decoded JWT Claims displaying both AuthN (sub) and AuthZ (roles/scopes)
{
  "iss": "https://auth.example.com/",
  "sub": "auth0|usr_9821a",            // AuthN: Who you are
  "email": "carlos@example.com",
  "email_verified": true,
  "roles": ["editor", "billing_admin"], // AuthZ: Roles
  "scope": "read:reports write:invoices" // AuthZ: Granular permissions
}
```

```javascript
// Application middleware enforcing AuthZ check after AuthN
function requirePermission(requiredScope) {
  return (req, res, next) => {
    // 1. AuthN check
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }
    // 2. AuthZ check
    if (!req.user.scopes.includes(requiredScope)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
}
```

> **Tip:** HTTP status code naming is notoriously confusing: **401 Unauthorized** actually means *Unauthenticated* (the server does not know who you are). **403 Forbidden** means *Unauthorized* (the server knows who you are, but you lack permission).

## Go deeper
Modern cloud architectures externalize authorization decisions to dedicated policy engines like **Open Policy Agent (OPA)** using declarative policy languages (Rego). Microservices query OPA sidecars locally with a JSON document of attributes, and OPA returns a sub-millisecond `allow: true` or `allow: false` decision, completely decoupling security policies from application code.
## Watch out
- Do not rely solely on role checks (`user.role === "admin"`) for multi-tenant data; always verify organization/tenant ownership on every query.
- Never transmit passwords or secrets in plain HTTP GET query parameters where they are logged in proxy server access logs.
## Remember
- Authentication verifies who you are; authorization verifies what actions you can take.
- Unauthenticated requests receive HTTP 401; unauthorized requests receive HTTP 403 Forbidden.
- RBAC assigns static roles; ABAC evaluates dynamic attributes for fine-grained access control.
