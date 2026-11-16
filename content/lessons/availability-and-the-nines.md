---
slug: availability-and-the-nines
title: "Availability & the Nines"
topic: foundations
kind: concept
summary: "Calculate downtime budgets across the nines, from 99% to 99.999%, and understand the cost of extra reliability."
tags: [availability, reliability, sre, nines]
related: [sli-slo-and-sla, single-points-of-failure, disaster-recovery-rto-and-rpo]
---
> **In one line:** Availability measures the percentage of time a system operates correctly, with each additional "nine" exponentially shrinking allowed downtime.

## The idea
Availability is the proportion of time that a system is functional and accessible to users under specified operating conditions. Formally:
$$\text{Availability} = \frac{\text{Uptime}}{\text{Uptime} + \text{Downtime}}$$
In industry, availability targets are commonly expressed as a count of "nines." While moving from "two nines" (99%) to "three nines" (99.9%) or "four nines" (99.99%) sounds like a minor incremental step, each nine represents a 10x reduction in permitted downtime.

Achieving higher nines is not merely a matter of buying better hardware; it demands fundamentally different architectural patterns. At two nines (3.65 days of downtime per year), human operators can respond to pager alerts and manually reboot servers. At three nines (8.77 hours per year), automated health checks and auto-healing instances are required. At four nines (52.6 minutes per year), all deployments must be zero-downtime rolling or blue/green updates with automated rollbacks. At five nines (5.26 minutes per year), active-active multi-region failover must occur sub-second without manual intervention.

Every additional nine increases infrastructure and engineering costs exponentially. A common engineering error is committing to "five nines" for a service that only requires 99.5% availability, wasting engineering bandwidth on distributed consensus and cross-region replication.

## See it
The table below computes the exact downtime permitted across the nines for a standard Gregorian calendar year (365.25 days = 8,766 hours):

| Availability Level | Permitted Downtime per Year | Permitted Downtime per Month (30d) | Required Architecture |
|---|---|---|---|
| **99% (Two nines)** | 3.65 days | 7.20 hours | Single server with manual restart |
| **99.9% (Three nines)** | 8.77 hours | 43.20 minutes | Multi-instance behind load balancer, read replicas |
| **99.99% (Four nines)** | 52.6 minutes | 4.32 minutes | Multi-AZ redundant deployment, automated failover |
| **99.999% (Five nines)** | 5.26 minutes | 25.9 seconds | Multi-region active-active, automated zero-downtime everything |

```yaml
# SLA calculation reference snippet
availability_tiers:
  tier_1_critical:
    target: 0.9999 # Four nines
    annual_downtime_minutes: 52.6
    scope: "Payment processing, Authentication"
  tier_2_standard:
    target: 0.999  # Three nines
    annual_downtime_minutes: 525.6
    scope: "Product catalog, User reviews"
  tier_3_internal:
    target: 0.99   # Two nines
    annual_downtime_minutes: 5256.0
    scope: "Reporting dashboard, Internal analytics"
```

> **Tip:** Availability must be measured from the user's perspective, typically by tracking the ratio of successful HTTP requests (status 2xx/3xx) to total valid requests, rather than server ping reachability.

## Go deeper
Availability compounds across dependencies. If a web application depends on three separate backend services in series, each offering 99.9% availability, the overall composite availability is:
$$A_{\text{composite}} = A_1 \times A_2 \times A_3 = 0.999 \times 0.999 \times 0.999 \approx 0.997 \text{ (99.7\%)}$$
Serial dependencies degrade availability. To achieve high overall availability, systems introduce redundancy (parallel dependencies) and graceful degradation so that non-critical service failures do not take down the main user journey.
## Watch out
- Do not promise five nines unless the business genuinely requires it and is prepared to fund the multi-region operational infrastructure.
- Remember that serial architecture dependencies multiply availability downwards; design fallbacks for non-critical dependencies.
## Remember
- Each additional "nine" reduces permitted downtime by 90% and exponentially increases architecture cost.
- Four nines allows under an hour of downtime per year; five nines allows approximately five minutes.
- Serial dependencies multiply availability downwards, requiring fallback mechanisms for resiliency.
