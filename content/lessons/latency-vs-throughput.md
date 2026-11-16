---
slug: latency-vs-throughput
title: "Latency vs Throughput"
topic: foundations
kind: concept
summary: "Distinguish response duration from request volume, and understand how concurrency bridges both."
tags: [performance, latency, throughput, concurrency]
related: [tail-latency-and-percentiles, the-nature-of-trade-offs, sli-slo-and-sla]
---
> **In one line:** Latency measures how long a single operation takes; throughput measures how many operations the system completes per unit of time.

## The idea
Performance in distributed systems is defined primarily by two metrics: latency and throughput. While frequently conflated, they measure fundamentally different dimensions of a system's capacity.

**Latency** is the time duration required to process a single request from the moment the client initiates the request until the complete response is received. It is expressed in time units: milliseconds (ms), microseconds (µs), or seconds (s). Latency includes transmission time across the network, operating system scheduling delays, queuing time waiting for an available thread, execution time on the CPU, and disk or network I/O.

**Throughput** is the rate at which a system processes operations over time. It is expressed in rates: requests per second (RPS), queries per second (QPS), transactions per second (TPS), or megabytes per second (MB/s). 

The relationship between latency and throughput is governed by Little's Law from queuing theory:
$$\text{Concurrency} = \text{Throughput} \times \text{Latency}$$
If a service has an average latency of 100 milliseconds ($0.1$ seconds) and must support a throughput of 1,000 requests per second, the service must concurrently process 100 requests at any given moment ($1000 \times 0.1 = 100$). If latency spikes to 1 second due to a slow downstream database query, the system must hold 1,000 requests concurrently to maintain the same throughput, rapidly exhausting connection pools and memory buffers.

## See it
Consider how batching changes the relationship between latency and throughput:

| Scenario | Latency per Event | Batch Size | System Throughput | Trade-Off Description |
|---|---|---|---|---|
| **Immediate Write** | 2 ms | 1 record | 500 records/sec | Low latency, high per-request I/O overhead |
| **Micro-Batching** | 25 ms | 100 records | 4,000 records/sec | Moderate latency, significant throughput increase |
| **Large Batch** | 500 ms | 5,000 records | 10,000 records/sec | High throughput, unacceptable for interactive APIs |

```bash
# Benchmarking latency vs throughput with wrk
# 4 threads, 100 concurrent connections, 30-second duration
wrk -t4 -c100 -d30s http://127.0.0.1:8080/api/v1/products

# Sample Output Analysis:
# Requests/sec: 4820.15 (Throughput)
# Latency: Avg 20.74ms, Stdev 8.12ms, Max 142.10ms (Latency)
```

> **Tip:** Adding batching or pipelining increases overall throughput by amortizing network round-trips and disk syncs, but it increases the latency of individual requests.

## Go deeper
When a system reaches saturation, latency does not increase linearly; it degrades exponentially. As utilization approaches 100%, incoming requests accumulate in queues waiting for worker threads. The time spent waiting in queues (queuing delay) quickly dominates the actual execution time (service time). This is why production systems typically trigger auto-scaling when CPU utilization reaches 65% to 75%, well before saturation.
## Watch out
- Do not assume high throughput implies low latency; a high-bandwidth data pipeline can process gigabytes per second while taking hours per job.
- Watch out for connection starvation: if latency doubles, concurrent connections double for the same request rate.
## Remember
- Latency is the duration of an individual request; throughput is the rate of completed requests.
- Little's Law ($L = \lambda W$) connects concurrency, throughput, and latency.
- Queuing delays cause latency to explode exponentially as system utilization approaches saturation.
