---
slug: monitoring-vs-observability
title: "Monitoring vs Observability"
topic: operations-and-security
kind: concept
summary: "Distinguish checking known failure modes (monitoring) from interrogating unknown complex system behaviors (observability)."
tags: [observability, monitoring, telemetry, sre]
related: [the-three-pillars-metrics-logs-traces, service-level-metrics-red-and-use, distributed-tracing-and-correlation]
---
> **In one line:** Monitoring tells you when a system is broken by tracking known failure modes; observability allows you to understand why it broke by interrogating internal states.

## The idea
In distributed systems operations, the terms "monitoring" and "observability" are frequently used interchangeably, but they represent fundamentally different engineering paradigms.

**Monitoring (Known Unknowns):**
Monitoring asks: *"Is the system working?"*
It is a dashboard-driven, black-box approach focused on predefined thresholds for known failure conditions. You configure alerts for specific failure modes you have already anticipated:
- "Alert if CPU utilization > 85% for 5 minutes."
- "Alert if disk free space < 10%."
- "Alert if HTTP 500 error rate > 1%."
Monitoring is essential for knowing *when* something has broken. However, in modern microservice architectures composed of hundreds of ephemeral containers and asynchronous queues, failures are rarely simple threshold violations. Outages are caused by complex emergent interactions, subtle configuration drift, and bizarre edge cases that nobody anticipated.

**Observability (Unknown Unknowns):**
Originating in control theory (Rudolf E. Kálmán), **observability** is a measure of how well internal states of a system can be inferred solely from knowledge of its external outputs.
Observability asks: *"Why is the system behaving this way?"*
An observable system emits rich, contextual, high-cardinality telemetry (metrics, structured logs, distributed traces). Rather than staring at static dashboards, an engineer can explore and slice data interactively:
- *"Show me all requests that took longer than 2 seconds, specifically for mobile users in Germany on app version 3.2, querying SKU 8819 on database shard 4."*
An observable system allows you to debug failure modes that have **never happened before and were never anticipated in advance**.

## See it
Compare the characteristics and capabilities of Monitoring and Observability:

| Dimension | Monitoring | Observability |
|---|---|---|
| **Core Question** | Is the system healthy or broken? | Why is the system behaving abnormally? |
| **Problem Domain** | Known Unknowns (anticipated failure modes) | Unknown Unknowns (novel emergent interactions) |
| **Perspective** | External black-box (CPU, memory, disk, ping) | Internal white-box (context propagation, spans) |
| **Tooling Paradigm** | Static dashboards, predefined threshold alerts | Interactive queries, ad-hoc exploratory debugging |
| **Data Nature** | Aggregated time-series counters and gauges | High-cardinality, high-dimensionality event records |
| **Primary Artifact** | Grafana dashboards, Nagios alerts | Distributed traces (OpenTelemetry, Jaeger, Honeycomb) |

```json
// Highly observable structured event payload with rich dimensional context
{
  "timestamp": "2026-11-16T20:20:15.102Z",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "service": "checkout-api",
  "duration_ms": 1840,
  "http_status": 504,
  "user_id": "usr_99182",
  "tenant_id": "enterprise_corp",
  "region": "eu-central-1",
  "cart_item_count": 42,
  "error": "gateway_timeout_upstream_inventory"
}
```

> **Note:** High-cardinality attributes like `user_id` and `trace_id` allow engineers to isolate the exact requests and accounts experiencing degradation among millions of concurrent operations.

## Go deeper
Charity Majors popularized the concept of **High Cardinality** as the foundation of true observability. Cardinality refers to the number of unique values in a set. User IDs, order UUIDs, and email addresses have millions of unique values. Legacy monitoring systems reject high cardinality because it causes database index explosions; modern observability engines are purpose-built to ingest and query high-cardinality events in seconds.
## Watch out
- Do not rely on static dashboards as your sole operational strategy; dashboards only show what you already knew to look for.
- Avoid alert fatigue: alert on customer-impacting symptoms (SLOs) rather than internal causes like server CPU usage.
## Remember
- Monitoring checks known thresholds; observability enables open-ended debugging of novel failures.
- Observability relies on high-cardinality telemetry to slice and isolate complex anomalies.
- An observable system allows engineers to explain any unexpected internal state from its external outputs.
