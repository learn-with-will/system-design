---
slug: distributed-tracing-and-correlation
title: "Distributed Tracing & Context Propagation"
topic: operations-and-security
kind: tool
summary: "Trace requests across microservice network boundaries using W3C Trace Context and OpenTelemetry spans."
tags: [distributed-tracing, opentelemetry, context-propagation, jaeger]
related: [the-three-pillars-metrics-logs-traces, monitoring-vs-observability, service-level-metrics-red-and-use]
---
> **In one line:** Distributed tracing instruments requests with unique trace and span IDs that propagate across network calls to reconstruct end-to-end execution paths.

## The idea
In a monolithic application, profiling request execution is straightforward: a profiler inspects the single process call stack in memory. In a microservices architecture, a single user click initiates a distributed cascade of RPC calls across ten separate servers, message queues, and databases. When the user experiences a 3-second delay, which service was the bottleneck?

**Distributed Tracing** solves this by tracking the path of a request across all network boundaries:
1. **Trace ID:** When a request enters the perimeter (at the API Gateway), the gateway generates a globally unique identifier: the **Trace ID** (e.g., a 128-bit hex string).
2. **Span ID:** Every timed operation within that request is assigned a **Span ID**. Each span records an operation name, start time, duration, metadata tags (e.g., HTTP route, SQL query), and a **Parent Span ID**.
3. **Context Propagation:** As the request travels from service to service, the calling service injects the Trace ID and Parent Span ID into the network transport headers (standardized by the **W3C TraceContext** specification as the `traceparent` header).

When downstream services receive the network call, they extract the `traceparent` header, create a child span referencing the parent, and continue the execution chain. A central visualization engine (such as Jaeger or Honeycomb) stitches these spans together into a **Directed Acyclic Graph (DAG)**, providing a visual Gantt chart of the entire distributed execution.

## See it
Trace the W3C `traceparent` header passing across microservice hops:

```flow
gw: API Gateway | Generates Trace ID: 4bf92f... @primary
auth: Auth Service | Child Span 01 @green
order: Order Service | Child Span 02 @green
db: Database Query | Child Span 03 (Slow!) @red
gw -> auth: HTTP with traceparent header
gw -> order: HTTP with traceparent header
order -> db: SQL Query (Parent: Span 02)
```

```http
// Standard W3C TraceContext header format (RFC / W3C Recommendation)
// Format: version - trace_id - parent_span_id - trace_flags
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
```

```javascript
// OpenTelemetry manual span instrumentation in Node.js
const { trace } = require('@opentelemetry/api');
const tracer = trace.getTracer('order-service');

async function processOrder(orderId) {
  // Start a child span that automatically inherits the ambient trace context
  return tracer.startActiveSpan('processOrderInternal', async (span) => {
    try {
      span.setAttribute('order.id', orderId);
      const result = await db.saveOrder(orderId);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      throw err;
    } finally {
      span.end(); // Marks end timestamp and dispatches span
    }
  });
}
```

> **Tip:** Distributed tracing instantly reveals whether latency is caused by **consecutive serial calls** (Service A waiting for B, then waiting for C) or by a single slow database query.

## Go deeper
In high-throughput systems processing millions of requests per second, storing every single trace is cost-prohibitive. Systems use **Tail-Based Sampling**: an OpenTelemetry collector buffers all spans for a request in memory until the request completes. If the request was fast and returned HTTP 200, it is sampled at 1%; if the request returned an HTTP 5xx error or exceeded 2 seconds, it is **100% retained** for debugging!
## Watch out
- Ensure background asynchronous message queue consumers (Kafka/RabbitMQ) propagate trace headers; dropping trace headers across message queues creates broken, orphaned traces.
- Do not include personally identifiable information (PII) like passwords or credit card numbers inside trace span attributes.
## Remember
- Distributed tracing tracks request execution across network boundaries using trace and span IDs.
- Context propagation injects the W3C `traceparent` header into outbound HTTP and gRPC calls.
- Use tail sampling to retain 100% of errors and slow requests while minimizing telemetry storage costs.
