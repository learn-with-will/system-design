---
slug: choosing-storage-by-access-patterns
title: "Choosing Storage by Access Patterns"
topic: storage-and-caching
kind: technique
summary: "A disciplined framework to select SQL vs NoSQL based on data relations, write volume, and query access patterns."
tags: [databases, storage-selection, architecture, data-modeling]
related: [relational-databases-and-acid, nosql-data-models, the-nature-of-trade-offs]
---
> **In one line:** Select databases by analyzing data relationships, write-to-read ratios, query patterns, and consistency requirements, rather than following industry hype.

## The idea
A persistent anti-pattern in system design is choosing a database based on hype, brand popularity, or the false premise that "SQL cannot scale." Modern PostgreSQL instances comfortably handle tens of thousands of transactions per second, while sharded relational databases power the world's largest financial and logistics networks.

Choosing the right storage engine requires evaluating four fundamental criteria:
1. **Data Model & Relationships:** Is your data highly structured with relational dependencies that require foreign key constraints and multi-table joins (SQL)? Or is it hierarchical and document-oriented (MongoDB), simple key-value lookups (Redis), or a deeply interconnected graph of entities (Neo4j)?
2. **Access Patterns (Read vs Write):** How will the application read and write data? If queries perform dynamic ad-hoc filtering across ten different fields, relational indexing is unmatched. If access is strictly primary-key lookups (`getUserById`), a key-value store provides superior latency and cost efficiency.
3. **Transaction & Consistency Requirements:** Does the business require atomic multi-row updates across different tables (ACID)? If an account deduction and audit record must commit together or not at all, a relational database is mandatory. If business logic can tolerate temporary staleness and eventual consistency, NoSQL offers superior partition tolerance.
4. **Volume & Write Throughput:** Is write volume measured in hundreds of writes per second (relational handles easily), or hundreds of thousands of writes per second from distributed IoT sensors (wide-column LSM-tree store like Cassandra is designed for this)?

## See it
Use this decision tree to evaluate storage requirements:

```tree
Storage Selection Framework
  Do you require multi-entity ACID transactions or complex SQL joins?
    [SQL] PostgreSQL / MySQL (Relational) @primary
  Is access purely primary-key lookups (session / cache / cart)?
    [KV] Redis / DynamoDB (Key-Value) @green
  Is data self-contained, nested JSON with rapidly evolving schema?
    [Doc] MongoDB / DocumentDB (Document) @blue
  Is it high-throughput append-only time-series or IoT telemetry?
    [Column] Cassandra / ScyllaDB (Wide-Column) @amber
  Are queries traversing deep multi-hop relationships (social / fraud)?
    [Graph] Neo4j / Amazon Neptune (Graph) @blue
```

```sql
-- Polyglot Persistence Architecture in an E-Commerce Platform
-- 1. Relational DB (PostgreSQL) owns transactional order billing:
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  total_cents INT NOT NULL,
  status VARCHAR(32) NOT NULL
);

-- 2. Document DB (MongoDB) owns dynamic product catalog with variant attributes:
-- { "_id": "prod_1", "name": "Running Shoes", "sizes": [9, 10, 11], "colors": ["red", "blue"] }

-- 3. In-Memory Key-Value (Redis) owns volatile shopping carts:
-- SET cart:usr_482 "{ items: [...] }" EX 604800
```

> **Tip:** Strive for simplicity first. Default to a battle-tested relational database (like PostgreSQL). Only extract components into specialized NoSQL stores when a specific access pattern demonstrably exceeds the relational engine's capabilities.

## Go deeper
Modern relational databases have blurred the lines with NoSQL. PostgreSQL provides high-performance binary JSON storage (`JSONB`) with GIN indexing, allowing developers to query nested semi-structured documents within standard SQL tables while retaining ACID transactions for relational columns.
## Watch out
- Do not choose NoSQL solely to avoid migrations; schema evolution exists in NoSQL too, and migrating unversioned JSON documents in application code is harder than SQL DDL migrations.
- Avoid introducing five different database technologies for a small engineering team; operational maintenance overhead will destroy team velocity.
## Remember
- Choose databases based on relationships, query access patterns, and consistency requirements.
- Default to PostgreSQL/relational storage until proven inadequate by specific scale or data structures.
- Adopt polyglot persistence deliberately, using specialized stores (Redis, S3, Cassandra) for targeted workloads.
