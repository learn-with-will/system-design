---
id: lesson-21
slug: designing-for-failure
title: "Designing for Failure"
level: advanced
order: 21
duration: 26
tags:
  - reliability
  - redundancy
  - failover
  - disaster-recovery
  - high-availability
---

# Learning Objectives

By the end of this lesson you will be able to:

- Explain why you must **design assuming failure**.
- Find and eliminate **single points of failure** with **redundancy**.
- Spread redundancy across **failure domains** and limit **blast radius**.
- Tell **replication** apart from **backups**.
- Plan **disaster recovery** using **RTO** and **RPO**.

# Why It Matters

Every component eventually fails: disks die, networks partition, processes crash, whole data
centers go dark, and people fat-finger commands. You cannot prevent failure — so the goal is
to make the system **survive** it. As the Google SRE practice puts it, you design for
failure so that when (not if) something breaks, users barely notice. This lesson pulls
together redundancy, failover, and recovery into a reliability strategy.

# Concept Explanation

### Assume everything fails

Hardware fails, dependencies go down, and networks misbehave. Designing for failure means
**asking "what happens when this breaks?"** for every component and having an answer that
isn't "the system goes down." The techniques below are how you build those answers in.

### Eliminate single points of failure with redundancy

A **single point of failure (SPOF)** is any component whose failure takes the whole system
down — one database, one load balancer, one server. You remove a SPOF with **redundancy**:
run more than one, so losing one is survivable.

- **N + 1** redundancy means one spare beyond what you need to serve load (N + 2 for two).
- **Active-active:** all redundant components serve traffic; losing one just reduces
  capacity. Great utilization and fast failover, but needs the components to share/replicate
  state.
- **Active-passive:** a standby waits idle and takes over on failure. Simpler, but the
  standby is wasted capacity and failover takes a moment.

### Spread across failure domains; limit blast radius

Redundancy only helps if the copies don't fail **together**. Three replicas in the **same
rack** all die if that rack loses power. So spread redundancy across independent **failure
domains**: different machines, racks, **availability zones** (isolated data centers), and
**regions**. Relatedly, design to limit **blast radius** — how much of the system one failure
can affect — by isolating (bulkheads, cells) so a fault stays local.

### Failover and health checks

**Failover** is the automatic switch to a redundant component when one fails; **health
checks** (Lesson 8) detect the failure so the switch can happen. As you saw with databases
(Lesson 10), failover must be designed carefully — beware split brain and lost writes.

### Replication is not a backup

A crucial distinction: **replication** keeps live copies in sync — but it faithfully
propagates **corruption and mistakes** too. If a bug or a bad `DELETE` wipes a table,
replication dutifully wipes it on every replica **instantly**. A **backup** is a
**point-in-time** copy you can **restore** from, precisely so you can recover from
corruption, accidental deletion, ransomware, or a bad migration. **You need both**:
replication for availability, backups for recovery. And a backup you have never **tested
restoring** is not a backup.

### Disaster recovery: RTO and RPO

**Disaster recovery (DR)** plans for major failures — losing a whole region, a catastrophic
data-corruption event. Two numbers define your target:

- **RTO — Recovery Time Objective:** the maximum acceptable **time to restore** service. "We
  must be back within 1 hour."
- **RPO — Recovery Point Objective:** the maximum acceptable **data loss**, measured in
  time. "We can afford to lose at most 5 minutes of data."

```text
        <---- RPO ---->  DISASTER  <---- RTO ---->
   last recoverable point   |          service restored
   (max data you can lose)  |          (max downtime allowed)
```

Tighter RTO/RPO cost more. Common strategies, from cheap/slow to costly/fast: **backup &
restore** (hours, more loss) → **pilot light** → **warm standby** → **multi-region
active-active** (near-zero RTO/RPO, most expensive). Choose from what the business can
tolerate.

### Test failure on purpose

You don't truly know a system tolerates failure until you've seen it fail. **Chaos
engineering** deliberately injects failures — killing instances, adding latency, simulating a
zone outage — in a controlled way, to verify redundancy and failover actually work before a
real outage tests them for you.

# Key Terminology

- **Single point of failure (SPOF)** — a component whose failure downs the whole system.
- **Redundancy (N+1/N+2)** — running spare capacity so a loss is survivable.
- **Active-active / active-passive** — all redundant units serve, vs a standby that takes
  over.
- **Failure domain** — a boundary within which things fail together (rack, availability zone,
  region).
- **Blast radius** — how much of the system one failure can affect.
- **Failover** — automatic switch to a redundant component on failure.
- **Backup vs replication** — point-in-time recovery copy vs live synced copies.
- **RTO / RPO** — max acceptable downtime / max acceptable data loss.
- **Chaos engineering** — deliberately injecting failures to test resilience.

# Options and Trade-offs

| DR strategy | RTO | RPO | Cost |
| ----------- | --- | --- | ---- |
| Backup & restore | Hours | Minutes–hours | Low |
| Pilot light | ~10s of minutes | Minutes | Medium |
| Warm standby | Minutes | Seconds–minutes | Higher |
| Multi-region active-active | Near zero | Near zero | Highest |

| Redundancy | Utilization | Failover speed |
| ---------- | ----------- | -------------- |
| Active-active | High (all serving) | Fast (already live) |
| Active-passive | Low (standby idle) | Slower (spin up/switch) |

# Worked Example

A web app runs in **one availability zone**: one load balancer, two app servers, one
database. Find and remove the single points of failure.

```text
  SPOFs:  single LB, single DB, single zone.

  Redesign:
    - Redundant load balancers (active-passive or a managed, redundant LB)
    - App servers spread across TWO availability zones (stateless -> easy)
    - Database with a synchronous standby in the OTHER zone; automatic failover
    - Regular, TESTED backups stored separately (for corruption/deletion recovery)
    - DR plan: RTO 30 min, RPO 5 min, with a warm standby in a second region
```

Now a server crash, a zone outage, or an LB failure is survivable — traffic and data shift to
healthy resources. The **backups** cover the case replication can't: someone drops a table
and replication copies the deletion everywhere; you restore from a point in time. Each change
maps to a specific failure you asked "what if?" about — which is the whole discipline.

# Real World Analogy

Designing for failure is aviation engineering. A plane has **redundant** engines,
hydraulics, and computers (N+1), each on **independent** systems (failure domains) so one
failure doesn't take its backup with it. Pilots **drill** emergencies (chaos testing).
**RTO/RPO** is like "how fast must we land and how much altitude can we lose" — planned in
advance. And a **backup** is the reserve parachute: replication keeps you flying, but if the
whole plane is compromised, you need something entirely separate to fall back on.

# Examples

## Example 1 — Basic: multi-AZ redundancy

An app spreads its stateless servers across three availability zones behind a redundant load
balancer. Losing an entire zone drops a third of capacity, but the service stays up.

**Why this works:** independent failure domains mean one zone's outage isn't correlated with
the others.

## Example 2 — Real-world: backups save you from replication

A bad migration corrupts a table; replication instantly corrupts all replicas. The team
restores the table from last night's backup plus the transaction log, losing only minutes of
data (meeting their RPO).

**Why this works:** backups are point-in-time and independent of live replication, so they
recover from corruption that replication would only spread.

## Example 3 — Trade-off / pitfall: redundancy in one failure domain

A team runs three database replicas — all in the same rack "for low latency." The rack loses
power and all three die at once.

**Why this bites:** redundancy only helps if copies fail independently. Co-locating them in
one failure domain defeats the purpose; spread them across zones.

# Common Mistakes

- **Leaving a SPOF** (one LB, one database, one zone). Add redundancy to every critical
  component.
- **Putting all replicas in one failure domain.** Spread across racks, zones, and regions.
- **Confusing replication with backup.** Replication spreads corruption; keep separate,
  tested backups.
- **Untested backups and failovers.** An unrehearsed recovery usually fails when you need it;
  drill it.
- **No defined RTO/RPO.** Without targets, you can't design or size DR correctly.

# Best Practices

- **Ask "what happens when this fails?" for every component**, and make the answer redundancy
  or graceful degradation.
- **Spread redundancy across failure domains** (zones/regions) and **limit blast radius**.
- **Keep separate, regularly *tested* backups** in addition to replication.
- **Define RTO and RPO from business needs**, then choose a DR strategy that meets them.
- **Practice failure** with chaos experiments and DR drills before real incidents.

# Summary

- **Assume everything fails** and design so the system survives it.
- Remove **single points of failure** with **redundancy** (N+1, active-active or
  active-passive), spread across independent **failure domains** to avoid correlated failure,
  and limit **blast radius**.
- **Replication is not a backup**: replication spreads corruption/deletes instantly, while
  **backups** are point-in-time copies for recovery — you need both, and backups must be
  **tested**.
- Plan **disaster recovery** to explicit **RTO** (max downtime) and **RPO** (max data loss)
  targets, choosing a strategy that meets them at acceptable cost.
- **Test failure deliberately** (chaos engineering, DR drills).

# Flash Cards

Q: What is a single point of failure, and how do you remove one?
A: A component whose failure takes the whole system down. You remove it with redundancy — running more than one so losing one is survivable.

Q: Why must redundant copies be in different failure domains?
A: Because redundancy only helps if the copies don't fail together. Three replicas in one rack all die if that rack loses power; spread them across zones/regions.

Q: How does a backup differ from replication?
A: Replication keeps live copies in sync and propagates corruption and deletes instantly; a backup is a point-in-time copy you restore from, so it can recover from corruption, mistakes, or deletion. You need both.

Q: What do RTO and RPO mean?
A: RTO (Recovery Time Objective) is the maximum acceptable time to restore service; RPO (Recovery Point Objective) is the maximum acceptable data loss, measured in time.

Q: What is the difference between active-active and active-passive redundancy?
A: In active-active, all redundant units serve traffic (high utilization, fast failover); in active-passive, a standby waits idle and takes over on failure (simpler, but wasted capacity and slower failover).

Q: What is chaos engineering, and why do it?
A: Deliberately injecting failures (killing instances, adding latency, simulating outages) in a controlled way to verify that redundancy and failover actually work before a real outage tests them.

# Exercises

### Easy
Look at this stack and list every single point of failure: one DNS provider, one load
balancer, three app servers in one zone, one database. For each SPOF, name a fix.

### Medium
Explain, with a concrete scenario, why replication alone would not protect you from an
accidental mass deletion, and what would.

### Challenging
Define RTO and RPO targets for (a) a bank's transaction system and (b) an internal wiki, and
choose a DR strategy for each from backup-restore, warm standby, or multi-region
active-active. Justify the cost trade-offs.

# Further Reading

- Google, *Site Reliability Engineering* and *The SRE Workbook* — https://sre.google/books/
  (redundancy, handling failures, and disaster recovery).
- AWS Well-Architected Framework — the Reliability Pillar (RTO/RPO and DR strategies).
