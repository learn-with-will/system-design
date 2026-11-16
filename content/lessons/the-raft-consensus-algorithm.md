---
slug: the-raft-consensus-algorithm
title: "The Raft Consensus Algorithm"
topic: distributed-coordination
kind: concept
summary: "Understand Raft's understandable design: leader election, randomized terms, heartbeats, log replication, and safety invariants."
tags: [raft, consensus, etcd, distributed-systems]
related: [distributed-consensus-fundamentals, paxos-and-raft-compared, distributed-locks-and-leases]
---
> **In one line:** Raft achieves distributed consensus by decomposing the problem into leader election, log replication, and strict safety invariants.

## The idea
For over two decades, Paxos was the dominant algorithm for distributed consensus. However, Paxos was notorious for being exceptionally difficult to understand and implement correctly. In 2014, Diego Ongaro and John Ousterhout introduced **Raft** in *In Search of an Understandable Consensus Algorithm*. Raft provides the exact same safety guarantees and formal equivalence as Paxos, but decomposes the problem into distinct, understandable subproblems.

Raft structures consensus around a **Strong Leader**:
1. At any given moment, each node is in one of three states: **Follower**, **Candidate**, or **Leader**.
2. Time is divided into **Terms** (numbered integer epochs). Each term begins with an election and has at most one leader.

**1. Leader Election:**
- Followers expect periodic **heartbeat** messages from the leader.
- If a follower hears no heartbeat within a **randomized election timeout** (typically 150–300 ms), it assumes the leader is dead, increments its term, transitions to **Candidate**, votes for itself, and sends `RequestVote` RPCs to all peers.
- If a candidate receives votes from a majority of nodes ($\lfloor N/2 \rfloor + 1$), it becomes the **Leader** and immediately begins transmitting heartbeats to suppress other elections.
- *Why randomized timeouts?* Randomization ensures that competing candidates do not split the vote; one node's timer expires first and claims the election before others wake up.

**2. Log Replication:**
- Clients submit write commands exclusively to the Leader.
- The leader appends the command to its local log and sends `AppendEntries` RPCs to all followers.
- Once a majority of followers acknowledge writing the entry, the entry is considered **Committed**. The leader applies it to its local state machine and returns success to the client. The leader's next heartbeat notifies followers to commit the entry to their state machines.

## See it
Trace a client write committed across a 3-node Raft cluster:

```sequence
actor client: Client
actor leader: Raft Leader (Term 1) @primary
actor f1: Follower 1 @green
actor f2: Follower 2 @green
client -> leader: Write "SET balance = 100"
note leader: Append to local log (Uncommitted)
leader -> f1: AppendEntries RPC (Log Entry)
leader -> f2: AppendEntries RPC (Log Entry)
f1 --> leader: ACK (Appended to log)
note leader: Majority ACK received (2 of 3) | Entry committed @green
note leader: Apply to state machine
leader --> client: Success (200 OK)
leader -> f2: Heartbeat (Notify commit index)
```

```yaml
# Raft cluster state inspection (etcdctl)
etcdctl endpoint status --write-out=table
# +------------------+------------------+---------+---------+-----------+-----------+------------+
# |     ENDPOINT     |        ID        | VERSION | DB SIZE | IS LEADER | RAFT TERM | RAFT INDEX |
# +------------------+------------------+---------+---------+-----------+-----------+------------+
# | 10.0.1.11:2379   | 8a1b2c3d4e5f6789 |  3.5.10 |   25 MB |      true |         3 |      18420 |
# | 10.0.1.12:2379   | 9b2c3d4e5f6789a1 |  3.5.10 |   25 MB |     false |         3 |      18420 |
# | 10.0.1.13:2379   | 1c2d3e4f5a6b7c8d |  3.5.10 |   25 MB |     false |         3 |      18420 |
# +------------------+------------------+---------+---------+-----------+-----------+------------+
```

> **Tip:** Raft's **Log Matching Property** guarantees that if two separate server logs contain an entry with the same index and term, they are guaranteed to be identical in all entries up to that index!

## Go deeper
Raft guarantees the **Leader Completeness Property**: a candidate can win an election *only* if its log is at least as up-to-date as any other majority member. When a node receives a `RequestVote` RPC, it compares the candidate's log term and index with its own; if the candidate's log is older, the node denies its vote! This ensures that committed entries are never overwritten by an out-of-date leader.
## Watch out
- Do not set Raft election timeouts shorter than network round-trip time plus disk write latency; overly aggressive timeouts cause continuous spurious leader re-elections.
- Ensure the leader writes entries to disk Write-Ahead Logs before transmitting to followers; in-memory-only logging breaks safety during sudden cluster power loss.
## Remember
- Raft decomposes consensus into leader election, log replication, and safety invariants.
- Randomized election timeouts (150–300ms) prevent split votes during leader election.
- An entry is committed once a majority of followers acknowledge writing it to disk.
