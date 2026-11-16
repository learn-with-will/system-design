---
slug: bulkhead-pattern
title: "The Bulkhead Pattern"
topic: distributed-reliability
kind: pattern
summary: "Isolate resource pools (threads, connections, memory) so failure in one feature cannot drown the entire system."
tags: [bulkhead, resilience, resource-isolation, patterns]
related: [partial-failure-and-blast-radius, circuit-breaker-pattern, load-shedding-and-graceful-degradation]
---
> **In one line:** The bulkhead pattern isolates critical resources into bounded pools so that the failure or saturation of one component cannot sink the entire application.

## The idea
In naval architecture, a ship's hull is divided into watertight compartments called **bulkheads**. If a rock punctures the ship's hull, water floods only that single isolated compartment. The remaining bulkheads stay dry, keeping the vessel afloat. If the ship had one giant open hull, a minor leak would fill the entire ship and sink it.

In distributed software architectures, Michael Nygard popularized the **Bulkhead Pattern** to prevent resource exhaustion from spreading across boundaries.

In an un-isolated application, all incoming requests share a single global thread pool and database connection pool:
- A user triggers an expensive, unindexed analytical export report that takes 45 seconds to run.
- Multiple users trigger the report, consuming all 100 available worker threads in the pool.
- When an ordinary user arrives to perform a lightweight 10 ms login or checkout, no threads are available to service their request! The entire application appears dead.

The Bulkhead pattern partitions shared resources into **isolated, bounded pools**:
1. **Thread Pool Bulkheads:** Allocate a dedicated thread pool of 10 threads for analytical reports, and a separate thread pool of 90 threads for user checkouts. Even if the reporting pool is 100% saturated and queuing, checkouts continue executing with zero interference.
2. **Database Connection Bulkheads:** Dedicate separate connection pools for read-heavy browsing versus write-heavy payments.
3. **Cluster Bulkheads (Cell-based Architecture):** Deploy separate server clusters for free-tier users and enterprise paying customers.

## See it
Compare a shared resource pool against partitioned bulkheads:

```flow
client: Incoming User Requests @neutral
gw: API Gateway @primary
pool-core: Core Checkout Pool | Max 90 threads @green
pool-rpt: Reporting Pool | Max 10 threads @amber
client -> gw: HTTP requests
gw -> pool-core: Route checkouts
gw -> pool-rpt: Route heavy reports
```

```yaml
# Resilience4j Bulkhead configuration in Spring Boot
resilience4j.thread-pool-bulkhead:
  instances:
    orderProcessing:
      maxThreadPoolSize: 50
      coreThreadPoolSize: 20
      queueCapacity: 100
    analyticsExport:
      maxThreadPoolSize: 5    # Isolated: Can never consume > 5 threads!
      coreThreadPoolSize: 2
      queueCapacity: 10
```

> **Note:** Even if thousands of users request analytics exports simultaneously, the analytics pool caps consumption at 5 threads, leaving 50 threads untouched for order processing.

## Go deeper
Cloud providers implement bulkheads at the hardware tier via **Availability Zones (AZs)** and **Cells**. A cellular architecture divides a company's fleet into 20 self-contained miniature datacenters ("cells"), each serving 5% of the customer base. A catastrophic database corruption or power failure in Cell 3 takes down only 5% of users; the other 95% of cells operate unaffected.
## Watch out
- Avoid over-partitioning resources; creating 50 tiny thread pools of 2 threads each introduces thread context-switching overhead and wastes idle CPU.
- Ensure queue sizes on bulkheads are bounded; an unbounded queue defeats the bulkhead by leaking memory.
## Remember
- Bulkheads isolate resources into independent compartments to prevent localized failures from sinking the whole system.
- Partition thread pools, connection pools, and memory buffers between critical and non-critical workloads.
- Combine bulkheads with cell-based architectures to contain the blast radius of infrastructure outages.
