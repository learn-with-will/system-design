---
id: lesson-11
slug: partitioning-and-sharding
title: "Partitioning (Sharding)"
level: intermediate
order: 11
duration: 28
tags:
  - partitioning
  - sharding
  - consistent-hashing
  - hotspots
  - rebalancing
---

# Learning Objectives

By the end of this lesson you will be able to:

- Explain what **partitioning (sharding)** is and why systems need it.
- Compare partitioning by **key range** and by **hash of key**.
- Explain **consistent hashing** and what problem it actually solves.
- Recognize **hotspots** and how to avoid them.
- Describe how requests are **routed** to the right partition and how **rebalancing** works.

# Why It Matters

Replication (last lesson) makes copies of the *whole* dataset — but every copy still has
to hold *all* the data and handle *all* the writes. When the data or the write volume
outgrows a single machine, you must **partition**: split the dataset into pieces and put
each piece on a different node. This is the **Z-axis** of the scale cube, and it's how
systems store petabytes and handle millions of writes per second.

# Concept Explanation

### What partitioning is

**Partitioning** (also called **sharding**) splits a large dataset into **partitions**
(shards), each holding a **subset** of the data on a different node. Each node is
responsible for its own partition's reads and writes, so total capacity grows with the
number of nodes. Partitioning is usually combined with replication: each partition is
itself replicated for availability.

```text
   All keys A..Z
        |
        v  split into partitions
   [ P1: A-H ]   [ P2: I-P ]   [ P3: Q-Z ]
     node 1        node 2        node 3
   (each partition also replicated to other nodes)
```

The central challenge is deciding **which key goes to which partition** — do it badly and
you get **skew** (uneven data) and **hotspots** (uneven load).

### Partitioning by key range

Assign a **contiguous range** of keys to each partition (A–H, I–P, Q–Z; or timestamps by
day). 

- **Upside:** efficient **range queries** — "all keys from I to L" live together.
- **Downside:** ranges are easily **unbalanced**. If your key is a timestamp, *all* new
  writes hit the newest partition — a hotspot — while older partitions sit idle.

### Partitioning by hash of key

Run each key through a **hash function** and assign hash values to partitions. Because a
good hash scatters keys uniformly, load spreads evenly.

- **Upside:** even distribution; no single partition is the "newest."
- **Downside:** you lose efficient range queries — adjacent keys land on different
  partitions.

Most large systems hash the key (or a chosen part of it) for balance, accepting the loss
of cheap range scans.

### Consistent hashing

Here's the trap with naive hashing: if you assign a key to `hash(key) mod N` partitions
and then **add or remove a node** (N changes), *almost every key* now maps to a different
node — a massive, disruptive reshuffle.

**Consistent hashing** solves exactly this. Picture the hash range as a **ring**. Both
nodes and keys are hashed onto the ring; a key belongs to the **next node clockwise**.

```text
        [Node A]
       /        \
   key3          key1
     |            |
   [Node C]----[Node B]      key -> first node clockwise from the key's position
```

When a node joins or leaves, **only the keys between it and its neighbor move** — roughly
**K/N keys** (K keys, N nodes), not all of them. That's the whole point: **consistent
hashing minimizes how much data must move when the set of nodes changes.** To keep the
load *balanced* (a few nodes on a ring can still split it unevenly), each physical node is
placed at **many** points on the ring using **virtual nodes (vnodes)**. Consistent hashing
and vnodes come from systems like Amazon's Dynamo.

> Note: consistent hashing's job is **minimizing remapping**, not producing a perfectly
> even split — that's what virtual nodes are for.

### Hotspots

A **hotspot** is a partition (or a single key) that gets far more load than the others —
often a **celebrity** user, a viral item, or a `mod`-friendly key. Even perfect hashing
can't help if *one key* is red-hot. Mitigations include adding a random prefix/suffix to
split a hot key across partitions (at the cost of having to read all the splits), or
caching the hot item in front of the store.

### Routing and rebalancing

- **Routing:** when a request arrives, something must know which partition holds the key.
  This can be a **routing tier**, a **coordinator** node, or **client-side** logic, often
  backed by a service that tracks the partition map (e.g. ZooKeeper).
- **Rebalancing:** when you add or remove nodes, partitions must be redistributed.
  A common trick is to create **many more partitions than nodes** up front and move whole
  partitions between nodes — cheaper and steadier than recomputing everything. Avoid
  `hash mod N`, precisely because changing N rebalances almost everything.

# Key Terminology

- **Partitioning / sharding** — splitting a dataset so each node holds a subset.
- **Partition / shard** — one such subset.
- **Range partitioning** — contiguous key ranges per partition (good for range scans).
- **Hash partitioning** — assign by hash of the key (good for even load).
- **Skew** — uneven distribution of data across partitions.
- **Hotspot** — a partition or key receiving disproportionate load.
- **Consistent hashing** — a ring-based scheme that minimizes key movement when nodes
  change.
- **Virtual nodes (vnodes)** — multiple ring positions per physical node, to balance load.
- **Rebalancing** — redistributing partitions when nodes join or leave.

# Options and Trade-offs

| Approach | Distribution | Range queries | Node changes |
| -------- | ------------ | ------------- | ------------ |
| Range partitioning | Can be skewed/hotspotted | Efficient | Manageable |
| Hash (mod N) | Even | Lost | Reshuffles almost everything |
| Consistent hashing (+ vnodes) | Even (with vnodes) | Lost | Moves only ~K/N keys |

# Worked Example

A key-value store on 3 nodes uses `hash(key) mod 3`. Traffic grows and you add a 4th node,
switching to `mod 4`.

```text
  key "user:42": hash = 100
    mod 3 -> node 1     (before)
    mod 4 -> node 0     (after)     <- moved!
  Repeat for nearly every key: almost all data must move at once.
```

Adding one node forced a near-total reshuffle — huge data movement and cache churn while
it happens. Now do it with **consistent hashing**: nodes and keys sit on a ring, and
adding node 4 only steals the arc of keys between node 4 and the neighbor it was inserted
before — about **1/4 of the keys**, and *only* those. The rest don't move at all.

```text
  Add a node on the ring:
    only the keys in the new node's arc relocate (~K/N)
    every other key stays put
```

Same goal (grow the cluster), vastly less disruption — which is why caches and distributed
databases use consistent hashing rather than `mod N`.

# Real World Analogy

Partitioning is like splitting a library's books across several buildings. **Range**
partitioning shelves them A–H here, I–P there — easy to grab a whole range, but if
everyone wants new arrivals (all filed under today's date), one building is mobbed
(hotspot). **Hash** partitioning assigns each book to a building by a scramble of its
title — evenly spread, but "all books from I to L" are now scattered. **Consistent
hashing** is arranging the buildings around a ring road so that opening a *new* building
only requires moving the books on the nearest stretch of road — not re-sorting the entire
city's libraries.

# Examples

## Example 1 — Basic: sharding users by hash

A social app hashes `user_id` to pick a shard. With billions of users spread evenly across
100 shards, each shard holds ~1% of users and handles ~1% of the load.

**Why this works:** hashing distributes users uniformly, so no shard is overloaded by the
data distribution itself.

## Example 2 — Real-world: consistent hashing in a cache cluster

A distributed cache uses consistent hashing with virtual nodes. When a cache node dies,
only its share of keys is remapped to neighbors; the other ~90% of keys keep hitting the
same nodes, so most of the cache stays warm.

**Why this works:** minimal remapping means minimal cache misses when the cluster changes.

## Example 3 — Trade-off / pitfall: the celebrity hotspot

A system shards by `user_id`, but one celebrity's shard gets 1,000× the reads of any
other. Perfect hashing doesn't help — it's a single hot *key*, not skewed distribution.

**Why this bites:** hashing balances *many* keys, not *one* hot key. You need a different
tool: cache the celebrity's data, or split their activity across sub-keys.

# Common Mistakes

- **Using `hash mod N`.** Changing N reshuffles nearly all keys; use consistent hashing.
- **Range-partitioning on a monotonic key** (timestamp, auto-increment id): all new writes
  pile onto the newest partition — an instant hotspot.
- **Forgetting virtual nodes.** Without them, a few nodes on a ring can still be badly
  unbalanced.
- **Ignoring hot keys.** Even balanced sharding can't fix one red-hot key; cache or split
  it.
- **No plan for routing.** Something must reliably map a key to its current partition, even
  as the cluster changes.

# Best Practices

- **Partition when data or write volume outgrows one node** — not before (it adds
  complexity).
- **Hash the key for even load**, unless you truly need range scans.
- **Use consistent hashing with virtual nodes** so scaling the cluster moves minimal data.
- **Choose partition keys that spread load** and avoid monotonic keys as the primary
  partition key.
- **Handle hot keys separately** (caching, sub-key splitting) — they're a different problem
  from balanced sharding.
- **Over-provision partitions** (many more than nodes) to make rebalancing cheap.

# Summary

- **Partitioning (sharding)** splits data across nodes so capacity grows with the cluster;
  it's usually combined with replication.
- **Range** partitioning enables range scans but risks hotspots; **hash** partitioning
  balances load but loses range scans.
- **Consistent hashing** minimizes how many keys move when nodes join or leave (~K/N), and
  **virtual nodes** keep the load balanced — its purpose is *minimal remapping*, not a
  perfect split.
- **Hotspots** (a single hot key) aren't solved by hashing; cache or split them.
- Plan for **routing** keys to partitions and cheap **rebalancing**; avoid `hash mod N`.

# Flash Cards

Q: What is the difference between range and hash partitioning?
A: Range partitioning assigns contiguous key ranges (good for range scans, but prone to hotspots); hash partitioning assigns by a hash of the key (even load, but no efficient range scans).

Q: What problem does consistent hashing actually solve?
A: It minimizes how many keys must move when a node joins or leaves — roughly K/N keys — instead of the near-total reshuffle that hash-mod-N causes.

Q: What are virtual nodes for?
A: To balance load in consistent hashing by placing each physical node at many points on the ring, so no node ends up with an oversized arc of keys.

Q: Why does range-partitioning on a timestamp cause a hotspot?
A: Because all new writes have the newest timestamp, so they all land on the single newest partition while older partitions sit idle.

Q: Can hashing fix a single celebrity hot key?
A: No — hashing balances many keys, not one red-hot key. You need caching or splitting that key across sub-keys.

Q: Why avoid hash-mod-N for assigning keys to nodes?
A: Because changing N (adding/removing a node) remaps almost every key at once, causing a massive, disruptive reshuffle and cache churn.

# Exercises

### Easy
You have 4 shards and choose to partition by hashing the user id. What fraction of users
does each shard hold, roughly, and why is that better than partitioning by the first
letter of the username?

### Medium
Explain, with a small diagram, what happens to key placement when you add a 5th node to a
consistent-hashing ring versus a `hash mod N` scheme. Roughly how many keys move in each?

### Challenging
Design the partitioning for a chat app storing billions of messages. Choose a partition
key, justify hash vs range, explain how you'd handle a group chat that becomes a hotspot,
and describe how a client finds the right shard for a given conversation.

# Further Reading

- Martin Kleppmann, *Designing Data-Intensive Applications*, Chapter 6 ("Partitioning").
- DeCandia et al., "Dynamo: Amazon's Highly Available Key-value Store" (SOSP 2007) — the
  origin of consistent hashing with virtual nodes in production.
