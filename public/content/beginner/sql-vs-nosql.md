---
id: lesson-06
slug: sql-vs-nosql
title: "Storage Foundations: SQL vs NoSQL"
level: beginner
order: 6
duration: 26
tags:
  - databases
  - sql
  - nosql
  - acid
  - data-modeling
---

# Learning Objectives

By the end of this lesson you will be able to:

- Describe the **relational** model and what **ACID** transactions guarantee.
- Name the four main **NoSQL** families and what each is good at.
- Explain **ACID vs BASE** without overstating either.
- Choose a database family from your **data model** and **access patterns**.
- Avoid the myth that "SQL doesn't scale and NoSQL does."

# Why It Matters

The database is usually the hardest part of a system to change later — it holds your data
and shapes every query. Choosing the wrong family means fighting your storage forever.
The choice is not about which is "better"; it's about matching the database to the shape
of your data and how you read and write it.

# Concept Explanation

### The relational model (SQL)

A **relational database** stores data in **tables** of **rows** and **columns**, with a
defined **schema** (each table's columns and types are fixed up front — "schema on
write"). You relate tables by keys and combine them with **joins**, and you query with
**SQL**. Relational databases are the default for good reason: decades of maturity,
powerful queries, and strong guarantees. Examples: PostgreSQL, MySQL.

Their signature feature is the **ACID transaction**:

- **Atomicity** — a transaction is all-or-nothing; a half-done transfer never happens.
- **Consistency** — a transaction moves the database from one valid state to another,
  respecting the rules you defined (constraints). Note: this "C" is largely the
  **application's** responsibility — the database enforces the constraints you declare.
- **Isolation** — concurrent transactions don't step on each other; each behaves as if it
  ran alone (to a degree set by the isolation level).
- **Durability** — once committed, data survives crashes.

### The NoSQL families

"NoSQL" covers several **non-relational** models that trade some of SQL's features
(rich joins, strict schema) for a different data shape, simpler scaling, or specific
access patterns:

| Family | Stores | Great for | Example systems |
| ------ | ------ | --------- | --------------- |
| Key-value | A value blob under a key | Ultra-fast lookups by key; caches, sessions | Redis, DynamoDB |
| Document | Self-contained JSON-like documents | Flexible, evolving records read as a whole | MongoDB, Couchbase |
| Wide-column | Rows with dynamic columns, grouped in column families | Huge write volume; time-series; large tables | Cassandra, Bigtable |
| Graph | Nodes and edges (relationships) | Relationship-heavy queries (social, fraud) | Neo4j |

Many NoSQL databases use a **flexible schema** ("schema on read" — the structure is
interpreted when you read the data), which makes evolving records easy but pushes the
responsibility for consistency into your application code.

### ACID vs BASE

Classic relational systems emphasize **ACID**. Many distributed NoSQL systems were
designed around **BASE**: **B**asically **A**vailable, **S**oft state, **E**ventual
consistency — they stay available and let replicas converge to the same value *over time*
rather than being instantly consistent everywhere. BASE is a design philosophy, not a
precise theorem; and the line has blurred — many modern NoSQL databases offer **tunable**
or even strong consistency, and several relational systems scale horizontally. Treat
ACID/BASE as ends of a spectrum, not a strict either/or.

### The scaling myth

You will hear "SQL doesn't scale; NoSQL scales." This is an **oversimplification**.
Relational databases scale reads with replicas and scale writes with partitioning, and
distributed SQL systems scale horizontally while keeping transactions. NoSQL systems
scale by *giving up* features (cross-entity joins, multi-key transactions, sometimes
strong consistency) to make horizontal scaling easier. The honest statement is: **they
make different trade-offs.** Choose by data model and required guarantees, not by a
slogan.

# Key Terminology

- **Relational database** — tabular data with a fixed schema, joins, and SQL.
- **Schema on write / on read** — validate structure when writing (relational) vs when
  reading (many NoSQL).
- **ACID** — Atomicity, Consistency, Isolation, Durability (transaction guarantees).
- **Join** — combining rows from multiple tables by a related key.
- **Key-value / Document / Wide-column / Graph** — the four common NoSQL families.
- **BASE** — Basically Available, Soft state, Eventual consistency (a NoSQL design
  philosophy).
- **Denormalization** — storing data pre-joined/duplicated to make reads fast (common in
  NoSQL).

# Options and Trade-offs

| Need | Lean toward | Why |
| ---- | ----------- | --- |
| Complex queries and joins across entities | Relational (SQL) | SQL and joins are built for this |
| Multi-record transactions / strong integrity | Relational (SQL) | ACID transactions across rows |
| Simple, fast lookups by a single key | Key-value | Minimal overhead, very fast |
| Flexible, self-contained records | Document | Schema-on-read; store/read a whole document |
| Massive write throughput / very large tables | Wide-column | Built to scale writes horizontally |
| Relationship-centric queries | Graph | Traversing edges is the native operation |

# Worked Example

You are choosing storage for two features of the same product.

**Feature A — orders and payments.** Money is involved; an order, its line items, and the
payment must all succeed or all fail, and reports join orders to customers and products.

```text
  Requirements: multi-row transactions, joins, strong integrity
  Choice: a relational database (ACID transactions, joins)
```

**Feature B — a user activity feed.** Enormous write volume (every click), each event is
a self-contained record, and you almost always read events by user and time range — no
joins.

```text
  Requirements: huge write throughput, simple access by (user, time), flexible fields
  Choice: a wide-column or document store (denormalized, scales writes)
```

The lesson: **one product often uses more than one database**, each chosen for a specific
data shape and access pattern. That's called **polyglot persistence** — and it's normal.

# Real World Analogy

Databases are like storage furniture. A **relational database** is a filing cabinet with
labeled, structured folders and cross-references — perfect when everything has a clear,
consistent form and you need to relate items. A **key-value store** is a coat check: give
a ticket, get your coat, instantly — but you can't ask "show me all the blue coats." A
**document store** is a set of labeled boxes, each holding everything about one thing. A
**graph database** is a corkboard of pinned photos connected by string — built for "who
is connected to whom."

# Examples

## Example 1 — Basic: sessions in a key-value store

Web session data (a token mapped to a user's state) is read and written constantly, by
key, with no joins. A key-value store like Redis serves this in-memory in microseconds.

**Why this works:** the access pattern is "get/put by key," which is exactly what
key-value stores optimize.

## Example 2 — Real-world: a social graph

"Friends of friends who like hiking" is a relationship traversal. In SQL it's a chain of
expensive joins; in a graph database it's a natural, efficient walk across edges.

**Why this works:** the query is about relationships, and graph databases treat
relationships as first-class.

## Example 3 — Trade-off / pitfall: NoSQL for highly relational data

A team stores an accounting system in a document database "for scale," then needs
transactions across accounts and complex reports. They end up reimplementing joins and
transactions in application code — badly.

**Why this bites:** they optimized for scale they didn't need and gave up the exact
features (joins, ACID transactions) the domain required. Match the model to the data.

# Common Mistakes

- **Choosing by hype, not by data model.** Pick based on how you read and write, not on
  what's trendy.
- **Believing "SQL can't scale."** Relational databases scale with replicas, partitions,
  and distributed SQL; the real difference is which features you keep.
- **Forcing relational data into a document store.** If your data is full of
  relationships and transactions, you'll rebuild SQL by hand.
- **Assuming NoSQL means "no schema."** The schema moves into your application; you still
  have one, just enforced later and by you.
- **Using one database for everything by default.** Different features can justify
  different stores (polyglot persistence).

# Best Practices

- **Start from the data and its access patterns**, then pick the family.
- **Default to relational** unless a specific need (scale shape, data model) pushes you
  elsewhere — it's mature and flexible.
- **Use ACID transactions** where correctness matters (money, inventory).
- **Denormalize deliberately** in NoSQL to serve known read patterns, accepting the
  duplication.
- **Allow polyglot persistence**: let each workload use the store that fits it.

# Summary

- **Relational (SQL)** databases use tables, a fixed schema, joins, and **ACID**
  transactions — the mature default for related data and strong integrity.
- **NoSQL** comes in four families — **key-value, document, wide-column, graph** — each
  trading some SQL features for a data shape or scaling model.
- **ACID vs BASE** is a spectrum, not a strict choice; modern systems blur the line.
- "SQL doesn't scale" is a **myth** — the families make **different trade-offs**; choose
  by data model and required guarantees.
- One product may use several databases (**polyglot persistence**).

# Flash Cards

Q: What do the letters in ACID stand for?
A: Atomicity, Consistency, Isolation, Durability — the guarantees of a relational transaction.

Q: What are the four main NoSQL families?
A: Key-value, document, wide-column, and graph.

Q: Is "SQL can't scale, NoSQL can" accurate?
A: No. It's an oversimplification — relational databases scale with replicas and partitioning, while NoSQL scales by giving up features like joins and multi-key transactions. They make different trade-offs.

Q: When is a graph database the right choice?
A: When your queries are about relationships and traversals (social networks, recommendations, fraud), which graph databases handle natively.

Q: What does BASE stand for, and how does it relate to ACID?
A: Basically Available, Soft state, Eventual consistency — a NoSQL design philosophy favoring availability and eventual convergence, at the opposite end of a spectrum from strict ACID.

Q: What is polyglot persistence?
A: Using more than one type of database in the same system, each chosen for a workload's data shape and access pattern.

# Exercises

### Easy
For each, name a suitable database family: (a) user login sessions, (b) a product catalog
with categories and reviews, (c) "people you may know" suggestions, (d) billions of
sensor readings written per day.

### Medium
Explain why the "C" in ACID (consistency) is largely the application's responsibility.
Give an example of a rule the database enforces versus a rule your application must
enforce.

### Challenging
A startup wants a single database for: user accounts and billing (transactional),
a product catalog (relational-ish), and a high-volume event log. Argue for either one
relational database or a polyglot approach. State the trade-offs of each and what would
change your mind.

# Further Reading

- Martin Kleppmann, *Designing Data-Intensive Applications*, Chapter 2 ("Data Models and
  Query Languages") and Chapter 7 ("Transactions").
- PostgreSQL documentation — https://www.postgresql.org/docs/ (relational model and
  transactions).
