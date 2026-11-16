---
slug: secret-management-and-key-rotation
title: "Secret Management & Key Rotation"
topic: operations-and-security
kind: tool
summary: "Eliminate hardcoded credentials using dedicated secret managers (Vault, KMS) and automated dynamic rotation."
tags: [secrets-management, hashicorp-vault, security, key-rotation]
related: [encryption-in-transit-and-at-rest, defense-in-depth, authentication-vs-authorization]
---
> **In one line:** Secret managers store credentials, database passwords, and API keys securely, providing centralized audit logging and automated rotation.

## The idea
One of the most pervasive vulnerabilities in software engineering is the proliferation of **hardcoded secrets**: database passwords, third-party API tokens, TLS private keys, and encryption keys committed to Git repositories or pasted into configuration files. Automated botnets continuously scrape public repositories, exploiting leaked AWS credentials within minutes.

**Dedicated Secret Managers (HashiCorp Vault, AWS Secrets Manager):**
A secret manager provides a hardened, centralized repository for sensitive credentials:
1. **Encryption at Rest:** Secrets are stored encrypted using KMS-backed master keys.
2. **Access Control & RBAC:** Applications authenticate using IAM roles or ephemeral service account tokens (e.g., Kubernetes service accounts) to retrieve only the specific secrets they require.
3. **Audit Logging:** Every access, retrieval, and modification of a secret is immutably logged with timestamp and caller identity.

**Automated Secret Rotation:**
Static credentials that never change represent an accumulating risk: if a database password is leaked, it remains dangerous until discovered. Modern architectures implement **Automated Key Rotation**:
- Secrets expire on a defined schedule (e.g., every 30 or 90 days).
- A background worker generates a new password, updates the database user account, updates the secret store, and notifies application connection pools.
- **Dynamic Secrets:** Advanced secret managers (like HashiCorp Vault) generate unique, ephemeral database credentials on the fly with short TTLs (e.g., valid for 1 hour). When the application shuts down or the TTL expires, Vault automatically drops the database user, leaving zero permanent credentials to steal!

## See it
Consider how an application retrieves credentials securely at boot time without local secrets:

```sequence
actor app: Container Pod @primary
actor vault: Vault / Secrets Manager @blue
actor db: Primary Database @green
app -> vault: Present ephemeral K8s token
note vault: Validate token against IAM policy
vault --> app: Temporary DB credentials (TTL: 1h)
app -> db: Connect with ephemeral credentials
note vault: Auto-revokes credentials after 1h
```

```bash
# Reading secrets dynamically using Vault CLI
export VAULT_ADDR="https://vault.internal:8200"

# Requesting ephemeral dynamic PostgreSQL credentials:
vault read database/creds/readonly-role

# Sample Output:
# Key                Value
# ---                -----
# lease_id           database/creds/readonly-role/8a1b-4c2d
# lease_duration     1h
# password           A1-x99b1z!qL4820
# username           v-token-readonly-948201
```

> **Tip:** By using dynamic credentials, even if an attacker extracts the database password from memory, the password automatically expires within 60 minutes and is useless.

## Go deeper
Store secrets in application memory as short-lived strings or secure buffers, and fetch them dynamically on demand. When configuring CI/CD pipelines (GitHub Actions, GitLab CI), use **OpenID Connect (OIDC) federation** to assume cloud IAM roles dynamically, eliminating the need to store permanent AWS Access Keys in repository settings.
## Watch out
- Never log environment variables in crash dumps or error logs; `console.log(process.env)` will leak all injected API keys to your log aggregation service.
- Ensure git pre-commit hooks (like `git-secrets` or `trufflehog`) scan code locally to block accidental secret commits before they reach the remote repository.
## Remember
- Never hardcode secrets in source code or static configuration files.
- Use dedicated secret managers (AWS Secrets Manager, HashiCorp Vault) with audit logging and IAM access control.
- Implement automated key rotation and dynamic ephemeral credentials to minimize the lifespan of leaked secrets.
