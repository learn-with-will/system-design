---
slug: oauth-2-and-openid-connect
title: "OAuth 2.0 & OpenID Connect"
topic: operations-and-security
kind: technique
summary: "Master delegated authorization with OAuth 2.0 Authorization Code Flow with PKCE and OIDC identity authentication."
tags: [oauth2, oidc, security, authentication, jwt]
related: [authentication-vs-authorization, defense-in-depth, encryption-in-transit-and-at-rest]
---
> **In one line:** OAuth 2.0 is an authorization framework for delegated resource access; OpenID Connect (OIDC) is an identity layer built on top of OAuth 2.0 for user authentication.

## The idea
Before OAuth, if a third-party app (like a calendar scheduler) wanted to access your Google Contacts, it had to ask for your raw Google username and password! This was an anti-pattern: the third-party app could impersonate you, read all your emails, and store your cleartext password insecurely.

**OAuth 2.0 (RFC 6749):**
OAuth 2.0 is an **authorization framework** that enables **delegated access**: a user can grant a third-party application limited access to their protected resources without sharing their credentials.
- The user authenticates directly with the Identity Provider (Google, GitHub, Okta).
- The user consents to specific permissions (**scopes**, e.g., `read:contacts`).
- The Identity Provider issues an **Access Token** to the third-party application. The application presents this token to the Resource Server (API) to access the permitted data.
- Crucially, **OAuth 2.0 is an authorization framework, not an authentication protocol**. An access token tells an API what actions are permitted; it says nothing about who logged in.

**OpenID Connect (OIDC):**
To standardize authentication on top of OAuth 2.0, **OpenID Connect (OIDC)** was introduced. OIDC extends the OAuth 2.0 flow by issuing an **ID Token** (a signed JWT) alongside the Access Token. The ID Token contains verified user identity claims (`sub` identifier, email, name) allowing applications to implement "Sign in with Google / GitHub" securely.

## See it
Trace the modern OAuth 2.0 Authorization Code Flow with PKCE (RFC 7636):

```sequence
actor user: End User / Browser
actor app: Single Page App (Client)
actor idp: Identity Provider (Auth0/Google) @primary
actor api: Resource Server (API) @green
user -> app: Click "Sign in with Google"
note app: Generate PKCE code_verifier & code_challenge
app -> idp: Redirect to /authorize (with code_challenge)
user -> idp: Authenticate & Consent to scopes
idp --> app: Redirect back with short-lived Authorization Code
app -> idp: POST /token (Code + code_verifier)
note idp: Validate code_verifier matches challenge
idp --> app: Returns ID Token (OIDC) & Access Token (OAuth)
app -> api: GET /api/v1/data (Bearer Access Token)
api --> app: Protected Resource Data
```

```http
// API Request presenting OAuth 2.0 Bearer Access Token
GET /api/v1/user/contacts HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzY29wZSI6InJlYWQ6Y29udGFjdHMiLCJleHAiOjE3MzE3ODkyMDB9...
Accept: application/json
```

> **Tip:** **PKCE (Proof Key for Code Exchange)** is now mandatory for all applications (single-page web apps, mobile apps, and backends). PKCE prevents authorization code injection attacks by requiring a cryptographic secret verifier on the token exchange.

## Go deeper
The four key roles in OAuth 2.0:
1. **Resource Owner:** The user who owns the data.
2. **Client:** The application requesting access (web app, mobile app).
3. **Authorization Server:** The system issuing tokens (Auth0, Okta, Keycloak).
4. **Resource Server:** The API holding the protected data.
## Watch out
- Never use the deprecated OAuth 2.0 "Implicit Flow"; it returns access tokens directly in the URL hash fragment, exposing them to browser history and XSS theft.
- Ensure the Resource Server cryptographically validates the token signature, expiration (`exp`), and audience (`aud`) on every request.
## Remember
- OAuth 2.0 handles delegated authorization; OpenID Connect (OIDC) handles user authentication.
- The Authorization Code Flow with PKCE is the gold standard for secure token issuance.
- ID Tokens (JWTs) verify identity; Access Tokens authorize API resource requests.
