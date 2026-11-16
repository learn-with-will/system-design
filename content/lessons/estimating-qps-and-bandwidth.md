---
slug: estimating-qps-and-bandwidth
title: "Estimating QPS & Bandwidth"
topic: estimation-and-capacity
kind: technique
summary: "Size system request rates, peak multipliers, read/write ratios, and network bandwidth from business assumptions."
tags: [estimation, qps, bandwidth, capacity]
related: [powers-of-two-and-data-units, estimating-storage-and-memory, latency-numbers-every-engineer-should-know]
---
> **In one line:** Sizing traffic requires converting daily active users into average and peak QPS, then multiplying by payload size to estimate bandwidth.

## The idea
When designing a system, sizing traffic is the first calculation you must perform. Traffic volume dictates how many application servers you must deploy, whether an in-memory cache is mandatory, and what network capacity must be provisioned.

The calculation follows a reliable sequence:
1. **Daily Active Users (DAU) to Daily Actions:** Determine how many actions an active user performs per day. For example, 100 million DAU performing an average of 5 read queries and 0.1 write queries per day.
2. **Daily Volume to Average QPS:** Convert total operations per day into operations per second. There are $24 \times 3,600 = 86,400$ seconds in a day. In interview settings and mental math, round 86,400 to **100,000** for fast calculations:
$$\text{Average QPS} = \frac{\text{Total Operations per Day}}{86,400} \approx \frac{\text{Total Operations}}{100,000}$$
3. **Peak QPS:** Traffic is never evenly distributed over 24 hours. Diurnal patterns, time zones, and viral events produce traffic spikes. A standard rule of thumb is that **Peak QPS is 2x to 5x Average QPS**. A system must be provisioned for its peak load, not its average.
4. **Network Bandwidth:** Multiply QPS by the average request and response payload sizes:
$$\text{Egress Bandwidth} = \text{QPS} \times \text{Average Response Payload Size}$$

## See it
Consider estimating capacity for a global photo-sharing service with 500 million Daily Active Users:

```text
Assumptions:
- Daily Active Users: 500M (5 * 10^8)
- Read Actions: 20 photo views / user / day = 10 Billion views / day
- Write Actions: 1 photo upload / user / day = 500 Million uploads / day
- Read-to-Write Ratio: 20:1
- Average photo size: 200 KB

Step 1: Calculate Average QPS
- Read QPS = 10,000,000,000 / 86,400 ≈ 115,700 QPS (approx 100,000 QPS)
- Write QPS = 500,000,000 / 86,400 ≈ 5,787 QPS (approx 5,000 QPS)

Step 2: Calculate Peak QPS (3x multiplier)
- Peak Read QPS = 115,700 * 3 ≈ 347,000 QPS
- Peak Write QPS = 5,787 * 3 ≈ 17,400 QPS

Step 3: Calculate Ingress and Egress Bandwidth
- Ingress (Uploads): 17,400 writes/sec * 200 KB = 3.48 GB/s = ~27.8 Gbps
- Egress (Views): 347,000 reads/sec * 200 KB = 69.4 GB/s = ~555 Gbps
```

```json
{
  "traffic_profile": {
    "read_qps_avg": 115700,
    "read_qps_peak": 347000,
    "write_qps_avg": 5787,
    "write_qps_peak": 17400,
    "network_ingress_gbps": 27.8,
    "network_egress_gbps": 555.2
  }
}
```

> **Tip:** Notice the massive 555 Gbps egress requirement. Serving this directly from origin application servers would saturate network links and rack switches; this immediately demonstrates why an edge CDN is non-negotiable.

## Go deeper
Read-to-write ratios heavily shape data architecture. In read-heavy systems (ratios of 100:1 or 50:1, such as Twitter, Wikipedia, or product search), architectures deploy caching clusters, read replicas, and CDNs. In write-heavy systems (ratios of 1:1 or 1:5, such as IoT sensor ingest or clickstream telemetry), architectures prioritize append-only partitioned event streams (Kafka) and log-structured storage engines.
## Watch out
- Never design server capacity based on average QPS; systems fall over during peak traffic spikes.
- Remember to multiply bandwidth in bytes by 8 to determine required network interface speed in bits (Gbps).
## Remember
- Divide daily operations by ~100,000 (or 86,400) to find average QPS.
- Size production infrastructure for peak QPS, typically 2x to 5x average load.
- Egress bandwidth equals QPS multiplied by payload size, converted to bits for network sizing.
