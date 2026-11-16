---
slug: nosql-data-models
title: "NoSQL Data Models"
topic: storage-and-caching
kind: concept
summary: "Evaluate the four primary NoSQL families: Document, Key-Value, Wide-Column, and Graph databases."
tags: [nosql, databases, data-modeling, document-store]
related: [relational-databases-and-acid, acid-vs-base, choosing-storage-by-access-patterns]
---
> **In one line:** NoSQL databases trade rigid relational schemas and joins for specialized data models, horizontal scalability, and high-throughput access patterns.

## The idea
Beginning in the late 2000s, the explosion of web-scale traffic, massive unstructured data streams, and distributed cloud hardware exposed the limitations of traditional single-node relational databases. The **NoSQL** ("Not Only SQL") movement emerged to address these challenges by abandoning rigid schemas and global joins in favor of specialized, horizontally scalable data models.

NoSQL databases are organized into four distinct families:
1. **Key-Value Stores (Redis, AWS DynamoDB, Memcached):** The simplest data model. Data is stored as an opaque blob indexed by a unique key. Lookups and writes operate in $O(1)$ constant time. Ideal for user sessions, shopping carts, and caching.
2. **Document Stores (MongoDB, Couchbase):** Stores semi-structured, hierarchical documents (typically JSON or BSON). Documents can nest arrays and sub-objects, mapping naturally to application domain objects without relational joins. Ideal for content management, user profiles, and catalogs where schemas evolve rapidly.
3. **Wide-Column Stores (Apache Cassandra, ScyllaDB, HBase):** Inspired by Google's Bigtable. Data is stored in sparse multidimensional sorted maps organized by row keys, column families, and timestamps. Optimized for massive write throughput across distributed clusters, making them ideal for time-series telemetry, financial tick data, and audit logs.
4. **Graph Databases (Neo4j, Amazon Neptune):** Focuses on highly interconnected data using nodes (entities), edges (relationships), and properties. Enables index-free adjacency, allowing queries to traverse millions of complex relationships in milliseconds. Ideal for social networks, fraud detection, and recommendation engines.

## See it
Compare the four NoSQL database paradigms:

| Family | Core Data Structure | Query Strengths | Primary Scalability Model | Canonical Technology |
|---|---|---|---|---|
| **Key-Value** | Hash table (`key -> value`) | Sub-millisecond $O(1)$ get/set | Partitioning by hash of key | Redis, DynamoDB |
| **Document** | JSON/BSON documents | Rich queries on nested fields | Horizontal sharding by shard key | MongoDB, Couchbase |
| **Wide-Column** | Row key -> Column families | High-throughput range scans & writes | Distributed masterless hash ring | Cassandra, ScyllaDB |
| **Graph** | Nodes, edges, properties | Fast relationship graph traversals | Sharding is difficult; vertical scale | Neo4j, Neptune |

```json
// Document Database record (MongoDB): nested structure eliminates joins
{
  "_id": "usr_9981",
  "name": "Sarah Connor",
  "contact": { "email": "sarah@example.com", "phone": "+1-555-0199" },
  "addresses": [
    { "type": "billing", "city": "Los Angeles", "zip": "90001" },
    { "type": "shipping", "city": "Pasadena", "zip": "91101" }
  ],
  "preferences": { "dark_mode": true, "notifications": ["email", "sms"] }
}
```

> **Tip:** In document databases, embed related data within the document if it is always read together (1-to-few relationship); reference external IDs if the relationship is 1-to-many or many-to-many to avoid unbounded document growth.

## Go deeper
Wide-column stores like Cassandra use log-structured merge-trees (LSM-trees). Writes append sequentially to an in-memory Memtable and a disk-based CommitLog. Periodically, Memtables flush to immutable SSTables on disk. Because writes never perform in-place random disk overwrites, write performance is virtually unmatched.
## Watch out
- Do not choose a document store simply to avoid designing a schema; unstructured data without application validation creates severe data quality debt.
- Graph databases scale poorly across multiple distributed machines; if your graph cannot fit on a single large node, traversing edges incurs massive network hops.
## Remember
- NoSQL encompasses four primary models: Key-Value, Document, Wide-Column, and Graph.
- Key-Value offers ultra-low latency; Document maps naturally to object code; Wide-Column excels at write-heavy time-series; Graph solves complex relationship traversal.
- NoSQL databases generally sacrifice cross-entity transactions and joins to achieve horizontal partition scalability.
