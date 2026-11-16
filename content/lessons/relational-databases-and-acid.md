---
slug: relational-databases-and-acid
title: "Relational Databases & ACID"
topic: storage-and-caching
kind: concept
summary: "Master the relational model, normalization, foreign keys, and the exact meanings of Atomicity, Consistency, Isolation, and Durability."
tags: [databases, sql, acid, transactions]
related: [nosql-data-models, acid-vs-base, choosing-storage-by-access-patterns]
---
> **In one line:** Relational databases organize structured data into normalized tables and enforce strict ACID transactional guarantees for data integrity.

## The idea
Proposed by Edgar F. Codd in 1970, the **relational database management system (RDBMS)** has served as the backbone of enterprise data architecture for over five decades. Relational databases (such as PostgreSQL, MySQL, and Oracle) organize data into structured tables with predefined schemas, composed of rows (records) and columns (attributes). Tables are interconnected via foreign key relationships, enabling complex querying, filtering, and joining via Structured Query Language (SQL).

The defining strength of an RDBMS is its support for **transactions** governed by the **ACID** guarantees:
- **Atomicity:** All-or-nothing execution. A transaction grouping multiple SQL statements either completes in its entirety or rolls back completely. If a bank transfer deducts $100 from Account A and crashes before crediting Account B, atomicity guarantees Account A's balance is restored.
- **Consistency:** The transaction preserves all database invariants, constraints, and cascade rules (e.g., unique constraints, foreign keys). Per Martin Kleppmann in DDIA, the 'C' in ACID is largely the application's responsibility to define valid business rules.
- **Isolation:** Concurrently executing transactions do not interfere with each other. The database ensures that concurrent operations appear to have executed sequentially, preventing dirty reads, non-repeatable reads, and phantom reads.
- **Durability:** Once a transaction is committed, its changes are permanently recorded in non-volatile storage (via a Write-Ahead Log, or WAL) and will survive a hardware power loss or server crash.

## See it
Consider a classical multi-step financial transaction executed under ACID guarantees:

```sql
-- Atomic financial transfer in PostgreSQL
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- 1. Deduct funds from sender account
UPDATE accounts
SET balance_cents = balance_cents - 10000
WHERE id = 'acc_alice' AND balance_cents >= 10000;

-- 2. Credit funds to recipient account
UPDATE accounts
SET balance_cents = balance_cents + 10000
WHERE id = 'acc_bob';

-- 3. Log ledger audit entry
INSERT INTO transfer_audit (from_acc, to_acc, amount_cents)
VALUES ('acc_alice', 'acc_bob', 10000);

-- Commit: atomically flushes WAL to disk and applies changes
COMMIT;
```

```yaml
# ACID transaction breakdown
acid_properties:
  atomicity: "Rolls back balance deduction if ledger insert fails"
  consistency: "Enforces CHECK (balance_cents >= 0) database constraint"
  isolation: "Prevents concurrent transfers from overdrawing Alice's account"
  durability: "Flushes Write-Ahead Log (WAL) to disk before returning success"
```

> **Note:** If the power cord is pulled on the server halfway through step 2, upon reboot the database replays its Write-Ahead Log and automatically rolls back Alice's uncommitted deduction.

## Go deeper
SQL databases offer four standardized ANSI SQL transaction isolation levels: Read Uncommitted, Read Committed (default in PostgreSQL), Repeatable Read, and Serializable. Higher isolation levels prevent concurrent anomalies (like write skew and lost updates) but incur greater lock contention and transaction abort rates.
## Watch out
- Do not assume high isolation levels are free; Serializable isolation can significantly degrade write throughput under heavy concurrent contention.
- Remember that the "C" in ACID (data integrity constraints) is completely unrelated to the "C" in the CAP theorem (linearizability).
## Remember
- Relational databases enforce strict schemas, foreign keys, and powerful SQL JOIN capabilities.
- ACID guarantees atomicity (all-or-nothing), consistency (constraints), isolation (concurrency), and durability (persistence).
- The Write-Ahead Log (WAL) guarantees durability by recording transaction commits sequentially to disk before updating data files.
