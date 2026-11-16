---
slug: service-level-metrics-red-and-use
title: "Service Metrics: RED & USE Methods"
topic: operations-and-security
kind: technique
summary: "Apply industry-standard metrics frameworks: RED for request services and USE for hardware resources."
tags: [metrics, red-method, use-method, sre, monitoring]
related: [the-three-pillars-metrics-logs-traces, monitoring-vs-observability, sli-slo-and-sla]
---
> **In one line:** The RED method monitors request-driven software services (Rate, Errors, Duration); the USE method monitors physical hardware resources (Utilization, Saturation, Errors).

## The idea
When monitoring production systems, engineers often suffer from dashboard chaos: hundreds of unorganized graphs displaying disk interrupts, memory paging, socket buffers, and network packets without any clear diagnostic hierarchy.

Industry veterans established two complementary mental models to standardize what metrics to capture and display:

**1. The RED Method (For Request-Driven Services):**
Formulated by Tom Wilkie, the **RED Method** applies to any service that processes incoming client requests (HTTP APIs, gRPC services, web applications):
- **Rate:** The number of requests the service is processing per second (throughput).
- **Errors:** The number of requests that fail per second (HTTP 5xx, exceptions, rejected transactions).
- **Duration:** The amount of time requests take to complete, measured as a statistical distribution (p50, p95, p99 latency).

Every microservice should have a standardized RED dashboard. If a service is experiencing problems, checking its Rate, Errors, and Duration immediately reveals whether traffic spiked, error rates surged, or latency degraded.

**2. The USE Method (For Hardware & Infrastructure Resources):**
Formulated by Brendan Gregg (Netflix performance architect), the **USE Method** applies to physical and virtual hardware resources (CPUs, memory, disks, network interfaces):
- **Utilization:** The percentage of time the resource was busy servicing work (e.g., CPU 85% busy, disk bandwidth 90% utilized).
- **Saturation:** The degree to which extra work is queuing up because the resource is 100% busy (e.g., Linux load average, disk I/O wait queue, network drop queues).
- **Errors:** The count of error events on the hardware (e.g., network packet drops, memory ECC errors, disk read retries).

## See it
Compare the application-level RED method with the resource-level USE method:

| Framework | Domain | Key Metric 1 | Key Metric 2 | Key Metric 3 |
|---|---|---|---|---|
| **RED Method** | Software Services / APIs | **Rate** (Requests/sec) | **Errors** (Failed requests/sec) | **Duration** (p50/p95/p99 latency) |
| **USE Method** | Hardware / Resources | **Utilization** (% time busy) | **Saturation** (Queue depth / backlog) | **Errors** (Hardware/network errors) |

```yaml
# Prometheus PromQL alerting rules implementing the RED Method
groups:
- name: service_red_alerts
  rules:
  # 1. Error Rate Alert (Errors / Rate > 1%)
  - alert: HighHttpErrorRate
    expr: |
      sum(rate(http_requests_total{status=~"5.."}[5m]))
      /
      sum(rate(http_requests_total[5m])) > 0.01
    for: 2m
    labels: { severity: critical }

  # 2. Duration / Latency Alert (p99 > 500ms)
  - alert: HighTailLatency
    expr: histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 0.5
    for: 3m
    labels: { severity: warning }
```

> **Tip:** When troubleshooting an incident, start with **RED** at the application tier to understand the customer impact, then dive into **USE** at the infrastructure tier to identify the underlying bottleneck (e.g., saturated disk I/O queue).

## Go deeper
Google SRE practice defines the **Four Golden Signals**: Latency (RED Duration), Traffic (RED Rate), Errors (RED Errors), and Saturation (USE Saturation). Standardizing on either RED or the Four Golden Signals ensures all engineering teams speak the same operational language.
## Watch out
- Do not measure utilization without measuring saturation; a disk at 100% utilization might have an acceptable queue of 0, or a catastrophic queue of 500 requests waiting.
- Always measure duration using percentiles (p95, p99) rather than arithmetic averages.
## Remember
- The RED method tracks Rate, Errors, and Duration for request-driven software services.
- The USE method tracks Utilization, Saturation, and Errors for underlying hardware resources.
- Standardize RED dashboards across all microservices to enable instantaneous triage during outages.
