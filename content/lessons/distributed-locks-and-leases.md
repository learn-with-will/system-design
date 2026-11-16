---
slug: distributed-locks-and-leases
title: "Distributed Locks & Leases"
topic: distributed-coordination
kind: technique
summary: "Coordinate mutual exclusion across distributed processes using Redis Redlock, etcd leases, and fencing tokens."
tags: [distributed-locks, leases, fencing-tokens, etcd]
related: [distributed-consensus-fundamentals, the-raft-consensus-algorithm, paxos-and-raft-compared]
---
> **In one line:** Distributed locks enforce mutual exclusion across separate servers using leases with TTLs, while fencing tokens protect against pause-induced split-brain.

## The idea
On a single server, thread synchronization is handled by OS mutexes or synchronized blocks in memory. But when multiple application servers in a cloud cluster need to ensure that **only one server at a time** performs an action (such as executing a midnight billing run or processing a physical warehouse shipment), they need a **Distributed Lock**.

A distributed lock operates via a shared consensus store (etcd, ZooKeeper, or Redis):
1. **Acquire:** A worker node attempts to create a unique key: `SET lock:billing_run worker_id NX EX 30`. The `NX` flag guarantees that the write succeeds *only* if the key does not already exist.
2. **Lease (TTL):** Every distributed lock **must have an expiration lease (TTL)**. If Worker A acquires the lock and immediately crashes, the lease expires after 30 seconds, automatically releasing the lock so Worker B can take over.
3. **Release:** Worker A deletes the lock key once its job completes. Crucially, the release must verify that Worker A still owns the lock before deleting it (using an atomic Lua script), preventing Worker A from accidentally releasing a lock that expired and was re-assigned to Worker B!

**The Fatal Flaw: Garbage Collection Pauses & Fencing Tokens**
Martin Kleppmann demonstrated that simple distributed locks are fundamentally unsafe without **Fencing Tokens**:
- Worker A acquires a 10-second lock.
- Worker A enters a major "Stop-the-World" Java garbage collection pause or network freeze that lasts 15 seconds!
- While Worker A is frozen, its 10-second lease expires in Redis.
- Worker B acquires the lock and begins writing to storage.
- Worker A wakes up from its GC pause! Unaware that its lock expired, Worker A writes to storage simultaneously with Worker B, **corrupting data!**

**The Solution: Fencing Tokens.**
The lock service increments a monotonically increasing counter on every lock acquisition (Lock 1, Lock 2, Lock 3). When Worker B acquires the lock, it receives Token 34. When Worker A wakes up, it attempts to write using Token 33. The storage system rejects Worker A's write because it has already accepted a write with higher Token 34!

## See it
Trace how a fencing token prevents data corruption during a garbage collection pause:

```flow
wa: Worker A | Pauses 15s (GC freeze) @red
lock-srv: Lock Server | etcd (Fencing tokens) @primary
wb: Worker B | Acquires lock after lease expires @green
storage: Storage System | Rejects out-of-order tokens @blue
wa -> lock-srv: 1. Acquire Lock (Token 33)
lock-srv -> wb: 2. Lease expires: Lock given (Token 34)
wb -> storage: 3. Write data (Token 34) ACCEPTED
wa -> storage: 4. Wakes up! Write Token 33 REJECTED
```

```lua
-- Safe Atomic Distributed Lock Release in Redis Lua
-- Verifies that the lock still belongs to the calling worker before deleting!
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0 -- Lock was lost / expired and acquired by someone else!
end
```

```bash
# Creating a safe distributed lock with etcdctl lease
LEASE_ID=$(etcdctl lease grant 30 | awk '{print $2}')
etcdctl put --lease=$LEASE_ID /locks/billing_runner "worker_01"
```

> **Tip:** Do not use distributed locks for trivial performance optimizations where duplicate execution does no harm; use them only when dual execution would cause irreversible business corruption.

## Go deeper
The **Redlock algorithm** (developed by Salvatore Sanfilippo) attempts to build distributed locks across five independent Redis instances without consensus. However, Martin Kleppmann's formal critique showed that without synchronized physical clocks and fencing tokens, Redlock cannot guarantee mutual exclusion in asynchronous networks subject to GC pauses and NTP jumps. For strict correctness, use Raft-backed stores like etcd or ZooKeeper.
## Watch out
- Never release a distributed lock with a plain `DEL` command; always check the worker ID inside an atomic Lua script to prevent deleting someone else's lock.
- Remember that distributed locks cannot guarantee safety against frozen processes without storage-level fencing tokens.
## Remember
- Distributed locks enforce mutual exclusion across separate server processes.
- Locks must have an expiration TTL lease to prevent deadlocks when workers crash.
- Fencing tokens (monotonically increasing IDs) protect storage from stale writes caused by GC pauses.
