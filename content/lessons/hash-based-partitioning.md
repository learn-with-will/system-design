---
slug: hash-based-partitioning
title: "Hash-Based Partitioning"
topic: distributed-data
kind: technique
summary: "Distribute data uniformly across shards using cryptographic hashes, eliminating hot spots at the cost of range scans."
tags: [sharding, hashing, databases, partitioning]
related: [sharding-fundamentals, range-based-partitioning, consistent-hashing]
---
> **In one line:** Hash-based partitioning passes keys through a hash function to scatter data uniformly across shards, preventing hot spots.

## The idea
To prevent the write hot spots inherent in range-based partitioning, modern distributed databases (such as Cassandra, MongoDB, and DynamoDB) primarily utilize **Hash-Based Partitioning** (also known as hash sharding).

The mechanism is straightforward:
1. The system selects a suitable 32-bit or 64-bit cryptographic hash function with uniform distribution properties (such as MurmurHash3 or MD5).
2. Given a key (such as `user_id`), the system computes its hash: `hash = Murmur3(user_id)`.
3. In naive hash partitioning with $N$ shards, the target shard is computed using modulo arithmetic:
$$\text{Shard ID} = \text{hash}(key) \pmod N$$

Even if client IDs are monotonically increasing (`1001`, `1002`, `1003`), the hash function acts as a pseudo-random scrambler:
- `Murmur3(1001) % 4 = Shard 1`
- `Murmur3(1002) % 4 = Shard 3`
- `Murmur3(1003) % 4 = Shard 0`

Sequential writes are scattered uniformly across all $N$ physical shards, distributing CPU, memory, and disk I/O evenly across the cluster.

**The Trade-Off: Sacrificing Range Scans**
The major downside of hash partitioning is that **ordering is destroyed**. Adjacent keys no longer reside on the same shard. If an application queries:
`SELECT * FROM users WHERE id BETWEEN 1000 AND 1050`
The database cannot perform an efficient range seek; it must broadcast the query to every single shard in the cluster (scatter-gather) and merge the results.

## See it
Consider how MurmurHash3 scatters sequential user IDs uniformly across 4 shards:

```flow
client: Incoming Sequential Writes | ID 1001, 1002, 1003 @neutral
hash: Hash Function | Murmur3(ID) % 4 @primary
s0: Shard 0 | Stores ID 1003 @green
s1: Shard 1 | Stores ID 1001 @green
s2: Shard 2 | Idle @blue
s3: Shard 3 | Stores ID 1002 @green
client -> hash: Evaluate partition key
hash -> s1: Murmur3(1001) % 4 = 1
hash -> s3: Murmur3(1002) % 4 = 3
hash -> s0: Murmur3(1003) % 4 = 0
```

```javascript
// MurmurHash3 modulo distribution demo
const crypto = require('crypto');
function getShardId(key, numShards = 4) {
  const hash = crypto.createHash('md5').update(String(key)).digest();
  // Read first 4 bytes as unsigned integer
  const intVal = hash.readUInt32BE(0);
  return intVal % numShards;
}

console.log('ID 1001 -> Shard', getShardId(1001)); // Shard 2
console.log('ID 1002 -> Shard', getShardId(1002)); // Shard 0
console.log('ID 1003 -> Shard', getShardId(1003)); // Shard 3
console.log('ID 1004 -> Shard', getShardId(1004)); // Shard 1
```

> **Watch out:** Notice that naive modulo partitioning (`hash(key) % N`) breaks when nodes are added! If $N$ changes from 4 to 5, almost every key hashes to a different shard, requiring a full cluster data migration.

## Go deeper
Databases like Cassandra solve the range query limitation within hash sharding using **Compound Primary Keys**: `PRIMARY KEY (user_id, created_at)`. The first column (`user_id`) is the **Partition Key** (hashed to find the shard node); the second column (`created_at`) is the **Clustering Column** (stored in sorted order on that specific shard). This allows fast range scans for a specific user's events!
## Watch out
- Do not use naive modulo arithmetic (`hash % N`) for dynamic caching or sharding where nodes are added or removed frequently; use consistent hashing.
- Remember that scatter-gather queries across 100 shards have their latency bound by the slowest single shard (tail latency amplification).
## Remember
- Hash partitioning passes keys through a hash function to achieve uniform data distribution across shards.
- Hash sharding eliminates write hot spots, even for monotonically increasing sequential IDs.
- Range queries cannot be localized and require expensive scatter-gather broadcasts across all shards.
