---
slug: consistent-hashing
title: "Consistent Hashing"
topic: distributed-data
kind: technique
summary: "Minimize data movement when adding or removing nodes by mapping keys and servers onto a circular hash ring."
tags: [consistent-hashing, algorithms, caching, sharding]
related: [hash-based-partitioning, virtual-nodes-and-rebalancing, sharding-fundamentals]
---
> **In one line:** Consistent hashing maps both keys and servers to a circular hash ring so that adding or removing a node requires moving only K/N keys.

## The idea
In naive hash partitioning, the target server is calculated as:
$$\text{Server} = \text{hash}(key) \pmod N$$
If you have 4 cache servers ($N=4$) and add a 5th server ($N=5$) to handle increased load, the denominator changes for *every single key*. As a result, approximately **$N / (N+1)$** (80%) of all keys re-hash to a different server. In a distributed cache, this triggers a catastrophic **cache wipeout**: 80% of lookups miss simultaneously, stampeding the backing database.

Introduced by Karger et al. in 1997, **Consistent Hashing** solves this problem elegantly by decoupling node count from hash ranges:
1. **The Hash Ring:** Imagine the entire output range of a hash function (e.g., 0 to $2^{32}-1$) connected in a continuous circle (a ring).
2. **Mapping Servers:** Each server node is hashed by its IP address or hostname and placed at a specific position on the ring.
3. **Mapping Keys:** When an item key is written or read, the key is hashed to find its position on the ring.
4. **Locating the Node:** The system walks **clockwise** around the ring from the key's position until it encounters the first server node. That server owns the key.

**The Golden Property:**
When a server node is added to or removed from a consistent hash ring, **only the keys between that node and its predecessor need to move**. On average, only **$K/N$** keys are relocated (where $K$ is total keys and $N$ is node count), leaving the remaining $(N-1)/N$ keys completely unaffected!

## See it
Visualize the circular hash ring topology and clockwise key assignment:

```flow
k1: Key "user_42" | Hash: 0x1200 @neutral
sa: Server A | Hash: 0x3000 @primary
k2: Key "order_99" | Hash: 0x4500 @neutral
sb: Server B | Hash: 0x8000 @blue
sc: Server C | Hash: 0xE000 @green
k1 -> sa: Clockwise seek to A
k2 -> sb: Clockwise seek to B
sa -> sb: Ring segment A -> B
sb -> sc: Ring segment B -> C
```

```javascript
// Minimal Consistent Hash Ring implementation
class ConsistentHashRing {
  constructor(nodes = []) {
    this.ring = new Map();
    this.sortedKeys = [];
    nodes.forEach(n => this.addNode(n));
  }
  addNode(node) {
    const h = this.hash(node);
    this.ring.set(h, node);
    this.sortedKeys.push(h);
    this.sortedKeys.sort((a, b) => a - b);
  }
  getNode(key) {
    if (!this.sortedKeys.length) return null;
    const h = this.hash(key);
    for (const nh of this.sortedKeys) {
      if (h <= nh) return this.ring.get(nh);
    }
    return this.ring.get(this.sortedKeys[0]); // Wraparound
  }
  hash(str) { return Murmur3(str); }
}
```

> **Note:** When Server B is removed, only keys between Server A and Server B migrate (to Server C). All other keys on the ring remain exactly where they were.

## Go deeper
Consistent hashing is the core architectural primitive powering distributed databases like Apache Cassandra and Amazon DynamoDB, as well as distributed caching proxies like Twemproxy and Envoy.
## Watch out
- Do not assume a small number of physical nodes will distribute keys evenly on a hash ring; randomly placed nodes create non-uniform partition slices.
- Solve non-uniform ring distribution by implementing virtual nodes (vnodes).
## Remember
- Consistent hashing maps both servers and data keys onto a circular hash ring.
- Keys are assigned to the first server encountered when traveling clockwise.
- Adding or removing a node relocates only $K/N$ keys, avoiding mass cache invalidation and re-sharding.
