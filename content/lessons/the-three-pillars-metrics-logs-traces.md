---
slug: the-three-pillars-metrics-logs-traces
title: "The Three Pillars: Metrics, Logs & Traces"
topic: operations-and-security
kind: concept
summary: "Correlate aggregated time-series metrics, structured event logs, and end-to-end distributed trace spans."
tags: [observability, metrics, logs, distributed-tracing, opentelemetry]
related: [monitoring-vs-observability, service-level-metrics-red-and-use, distributed-tracing-and-correlation]
---
> **In one line:** Observability telemetry is grounded in three pillars: Metrics for trends and alerts, Logs for detailed event context, and Traces for end-to-end distributed request paths.

## The idea
To achieve observability across distributed microservice topologies, systems generate three distinct categories of telemetry, classically known as the **Three Pillars of Observability**:

**1. Metrics (Aggregated Time-Series Numbers):**
Metrics are numeric measurements aggregated over fixed intervals of time: counters (monotonically increasing counts, like total requests), gauges (fluctuating values, like active memory usage), and histograms (statistical distributions, like request latency percentiles).
- *Strength:* Extremely compact and inexpensive to store. Storing 1,000 metrics per second for a year consumes megabytes, making metrics ideal for alerting, real-time dashboarding, and tracking long-term trends.
- *Limitation:* Lacks context. A metric tells you that error rates spiked to 5% at 2:04 PM, but cannot tell you which users failed or why.

**2. Logs (Discrete Event Records):**
A log is a timestamped text or JSON document emitted when an event occurs in code (e.g., *"User logged in"*, *"Database connection timeout"*).
- *Strength:* Rich local context, stack traces, and variable values.
- *Limitation:* Expensive to store and index at scale. Furthermore, a single service log record cannot show how a request traversed across 20 other microservices.

**3. Traces (Distributed Request Journeys):**
A trace tracks the complete journey of a single user request as it flows across network boundaries, message queues, and microservices. A trace is composed of multiple nested **Spans**, each representing a timed unit of contiguous execution (e.g., an HTTP call, a database query, a Redis lookup).
- *Strength:* Reveals exact network latency bottlenecks, downstream dependencies, and points of failure across complex call graphs.

## See it
Compare the roles and trade-offs of the three observability pillars:

| Pillar | Data Type | Primary Strength | Cost to Store | Typical Technology |
|---|---|---|---|---|
| **Metrics** | Numeric time-series ($t, value$) | Fast alerts, long-term trends, dashboards | Very low (highly compressible) | Prometheus, Datadog |
| **Logs** | Structured text / JSON events | Deep contextual detail, error stack traces | High (terabytes of raw text) | Elastic, Loki, CloudWatch |
| **Traces** | Directed acyclic graphs of spans | Maps cross-service latency and call paths | High (often sampled, e.g. 1%) | OpenTelemetry, Jaeger |

```flow
client: User Request @neutral
sgw: Span 1: API Gateway (Total: 150ms) @primary
sauth: Span 2: Auth Service (20ms) @green
sorder: Span 3: Order Service (120ms) @blue
sdb: Span 4: PostgreSQL Query (105ms Bottleneck!) @red
client -> sgw: HTTP POST /orders
sgw -> sauth: Validate token
sgw -> sorder: Create order
sorder -> sdb: INSERT INTO orders (Slow query!)
```

```yaml
# OpenTelemetry Collector pipeline configuration unifying the three pillars
receivers:
  otlp:
    protocols:
      grpc: { endpoint: "0.0.0.0:4317" }
      http: { endpoint: "0.0.0.0:4318" }

processors:
  batch: { timeout: 1s, send_batch_size: 1024 }

exporters:
  prometheus: { endpoint: "0.0.0.0:8889" } # Exports Metrics
  loki: { endpoint: "http://loki:3100" }   # Exports Logs
  otlp/jaeger: { endpoint: "jaeger:4317" } # Exports Traces
```

> **Tip:** **Correlate the three pillars!** When logging an error, always include the active `trace_id`. In your observability tool, clicking a metric spike takes you to the matching traces, and clicking a trace span instantly pulls up the exact logs emitted during that span.

## Go deeper
The industry has standardized on **OpenTelemetry (OTel)**, a vendor-neutral CNCF project that provides unified SDKs, APIs, and wire protocols for collecting metrics, logs, and traces. Using OTel prevents vendor lock-in, allowing teams to swap backend visualization platforms (Datadog, Grafana, Honeycomb) with zero code rewrites.
## Watch out
- Do not log high-volume debugging statements in production without sampling; uncompressed log spam can saturate disk I/O and incur massive cloud storage bills.
- Remember that 100% trace capture on high-throughput systems (100,000 QPS) is cost-prohibitive; implement tail sampling to capture all errors and a fraction of healthy traces.
## Remember
- Metrics provide cheap numeric trends and alerts; logs provide rich contextual event details.
- Traces track the end-to-end journey of requests across distributed microservice boundaries.
- Correlate all three pillars by injecting unified trace IDs into all log statements and error reports.
