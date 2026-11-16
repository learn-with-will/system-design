---
slug: disaster-recovery-rto-and-rpo
title: "Disaster Recovery: RTO & RPO"
topic: operations-and-security
kind: concept
summary: "Define Recovery Time Objective (RTO) and Recovery Point Objective (RPO) across disaster recovery strategies."
tags: [disaster-recovery, rto, rpo, backups, sre]
related: [single-points-of-failure, failure-domains-and-blast-radius, chaos-engineering-and-game-days]
---
> **In one line:** RTO defines the maximum acceptable downtime to restore operations; RPO defines the maximum acceptable data loss measured in time.

## The idea
Disasters happen: a ransomware attack encrypts production databases, an errant script drops critical tables, or a regional datacenter is taken offline by a natural disaster. **Disaster Recovery (DR)** planning ensures an organization can survive catastrophic events.

All disaster recovery architectures are defined by two core metrics:

1. **Recovery Time Objective (RTO):**
   *How long can the system be down before business survival is threatened?*
   RTO is the target time duration between the moment an outage occurs and the moment the service is fully restored and operational. If your RTO is **2 hours**, your engineering team must detect, diagnose, spin up replacement infrastructure, and restore service within 120 minutes.
2. **Recovery Point Objective (RPO):**
   *How much data can the business afford to lose, measured in time?*
   RPO dictates backup frequency and replication models. If backups are taken once every night at midnight, and the database crashes at 11:00 PM, 23 hours of customer data is permanently lost. If your RPO is **15 minutes**, your database must continuously ship transaction logs or snapshots every 15 minutes. An RPO of **zero** demands synchronous multi-region replication.

**The Four DR Strategies (Cost vs Speed):**
- **Backup & Restore (Cold Standby):** Backups stored in S3. Cheap, but high RTO (hours/days to provision servers and restore terabytes of data).
- **Pilot Light:** Core data is continuously replicated to a secondary region, but application servers are kept powered off. RTO: 30–60 minutes.
- **Warm Standby:** A scaled-down, functional copy of the entire application runs continuously in the secondary region. RTO: minutes.
- **Multi-Region Active-Active (Hot Standby):** Full-capacity clusters run concurrently across regions, serving live traffic. RTO: sub-second; RPO: near zero; highest infrastructure cost.

## See it
Compare the four disaster recovery strategies across RTO, RPO, and cost:

| DR Strategy | Description | RTO (Downtime) | RPO (Data Loss) | Cost |
|---|---|---|---|---|
| **Backup & Restore** | Daily snapshots in cloud storage | 24–48 hours | 12–24 hours | $ (Minimal) |
| **Pilot Light** | Replicated DB active; compute turned off | 30–60 minutes | < 15 minutes | $$ (Moderate) |
| **Warm Standby** | Scaled-down 20% capacity cluster live | 5–10 minutes | < 1 minute | $$$ (High) |
| **Active-Active** | Full multi-region clusters taking live load | **Near Zero (Instant)** | **Near Zero** | $$$$ (Very High) |

```yaml
# AWS Backup plan enforcing continuous point-in-time recovery (PITR)
backup_policy:
  resource_type: "RDS:PostgreSQL"
  continuous_backup: true # WAL continuously archived to S3!
  point_in_time_recovery_window_days: 35
  rpo_target_minutes: 5   # Maximum 5 minutes of data loss on total failure
  rto_target_minutes: 30  # Restored automated instance in 30 minutes
```

> **Tip:** Enable **Point-in-Time Recovery (PITR)** on relational databases. Continuous WAL archiving to S3 allows you to restore your database to any specific second in time over the last 35 days (e.g., 11:42:19 AM—one second before an engineer accidentally dropped the table!).

## Go deeper
An untested disaster recovery plan is merely a wish. Backup files can become corrupt, encryption keys can be lost, and infrastructure automation scripts can fail when executed in an empty account. Rigorous organizations perform quarterly **DR Game Days**, simulating a total regional cutoff to prove that systems restore within target RTO and RPO limits.
## Watch out
- Do not confuse high availability with disaster recovery; multi-AZ replication will faithfully replicate a dropped table across all replicas instantly.
- Ensure database backups are stored in an immutable, read-only bucket with separate administrative credentials to survive ransomware attacks.
## Remember
- RTO is the maximum allowed downtime; RPO is the maximum allowed data loss measured in time.
- DR strategies balance cost against speed: Backup & Restore, Pilot Light, Warm Standby, and Active-Active.
- Regularly test recovery procedures with DR Game Days to verify that backup automation works under pressure.
