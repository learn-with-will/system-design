---
slug: failure-domains-and-blast-radius
title: "Failure Domains & Blast Radius"
topic: operations-and-security
kind: pattern
summary: "Structure physical and logical failure boundaries across racks, Availability Zones, regions, and cell-based architectures."
tags: [failure-domains, availability-zones, blast-radius, cellular-architecture]
related: [single-points-of-failure, disaster-recovery-rto-and-rpo, bulkhead-pattern]
---
> **In one line:** A failure domain is a boundary within which a fault can propagate; resilient architectures isolate domains to contain the blast radius of outages.

## The idea
Redundancy is useless if all your redundant copies share the same point of physical failure. If you deploy three database replicas, but all three servers sit in the same server rack plugged into the same power distribution unit (PDU), a blown fuse will take down all three replicas simultaneously!

A **Failure Domain** is the physical or logical perimeter within which a failure can propagate:
- **Server Level:** A single motherboard or CPU crash.
- **Rack Level:** A failure of the rack's shared power supply or Top-of-Rack (ToR) switch.
- **Availability Zone (AZ) Level:** An entire datacenter facility suffering a utility power outage, flood, or fiber cable severance. AZs within a cloud region are physically separated by tens of kilometers but connected via ultra-low-latency fiber (< 1–2 ms).
- **Region Level:** A severe geographic catastrophe (earthquake, hurricane) or widespread cloud control plane outage taking down an entire AWS/GCP region.

**Cell-Based Architecture:**
At massive scale, hyper-growth companies (AWS, Slack, Netflix) construct **Cells**: independent, completely isolated instances of the entire platform. Each cell manages a fixed slice of the customer base (e.g., 5% of users). Cells share zero infrastructure, zero databases, and zero message buses. If a toxic request or corrupted code deployment crashes Cell 4, the **blast radius is strictly bounded to 5% of users**, while the other 95% of the customer base experiences zero downtime.

## See it
Compare deployment architectures across failure domain boundaries:

```tree
Failure Domain Separation
  Region (us-east-1)
    Availability Zone 1a
      [AZ 1a] App Pod 1 & Primary DB @green
    Availability Zone 1b
      [AZ 1b] App Pod 2 & Synchronous Standby DB @blue
```

```yaml
# Kubernetes Pod Anti-Affinity enforcing failure domain separation
# Prohibits scheduling two pods of the same service in the same Availability Zone!
affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
    - labelSelector:
        matchExpressions:
        - key: app
          operator: In
          values: ["checkout-api"]
      topologyKey: "topology.kubernetes.io/zone"
```

> **Tip:** Kubernetes `topologyKey: "topology.kubernetes.io/zone"` forces the scheduler to distribute application pods across distinct physical Availability Zones, ensuring that an AZ datacenter outage leaves surviving replicas operational.

## Go deeper
A common disaster recovery pitfall is deploying all disaster recovery infrastructure in the same cloud region. If an AWS region-wide identity management (IAM) or S3 control plane outage occurs, both your primary and backup clusters in that region are paralyzed. True disaster resilience requires deploying across independent geographical regions (e.g., `us-east-1` and `us-west-2`).
## Watch out
- Never place all database replicas inside the same availability zone; multi-instance replication provides zero protection against datacenter-wide power failures.
- Ensure cross-region data transfers account for egress bandwidth costs, which can become astronomical for high-volume streaming.
## Remember
- A failure domain defines the scope of damage when a localized fault occurs.
- Distribute redundant copies across distinct Availability Zones to survive datacenter outages.
- Use cellular architectures to constrain software bugs and outages to a small fraction of users.
