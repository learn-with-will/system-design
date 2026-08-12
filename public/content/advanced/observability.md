---
id: lesson-22
slug: observability
title: "Observability: Logs, Metrics & Traces"
level: advanced
order: 22
duration: 26
tags:
  - observability
  - metrics
  - logging
  - tracing
  - monitoring
---

# Learning Objectives

By the end of this lesson you will be able to:

- Explain what **observability** is and why distributed systems need it.
- Describe the **three pillars**: logs, metrics, and traces, and when each helps.
- Apply the **RED** and **USE** methods to decide what to measure.
- Alert on **symptoms** (SLOs), not noise.
- Explain what **distributed tracing** and **OpenTelemetry** provide.

# Why It Matters

When a monolith breaks, you read one log file. When a request flows through ten services,
you need to know *which* one failed, *why*, and *where the time went* — from the outside.
**Observability** is the ability to understand a system's internal state from its external
outputs. Without it, a distributed system is a black box, and every incident is a guessing
game. With it, you can answer questions you didn't anticipate when you built it.

# Concept Explanation

### Monitoring vs observability

**Monitoring** watches for known problems ("is CPU over 90%? is the site up?").
**Observability** is broader: can you explain **new, unexpected** behavior — the "why is
*this specific* request slow?" you never pre-defined a dashboard for? Monitoring tells you
*that* something is wrong; observability helps you find out *why*.

### The three pillars

Observability is commonly built on three kinds of telemetry:

| Pillar | What it is | Great for | Watch out for |
| ------ | ---------- | --------- | ------------- |
| **Logs** | Timestamped records of discrete events | Detailed debugging, "what happened here" | High volume and cost; use structured logs |
| **Metrics** | Numeric measurements over time, aggregated | Dashboards, trends, alerting | Low detail; label cardinality can explode |
| **Traces** | The path of one request across services | Finding *where* latency/failures occur | Sampling; needs context propagation |

- **Logs** are the detail. Prefer **structured logging** (e.g. JSON with fields) over plain
  text so you can search and aggregate them. They're rich but expensive at scale.
- **Metrics** are cheap numbers aggregated over time — counters (requests served), gauges
  (queue depth), histograms (latency distributions). Ideal for dashboards and alerts, but
  each **label** combination is a new time series, so high-**cardinality** labels (like user
  id) can blow up storage.
- **Traces** follow **one request** as it hops across services, recording **spans**
  (parent-child timed segments). A trace shows exactly where a request spent its time and
  which hop failed — indispensable in microservices.

### What to measure: RED and USE

Two simple frameworks tell you which metrics matter:

- **RED** (for request-driven **services**): **R**ate (requests/sec), **E**rrors (failed
  requests), **D**uration (latency distribution). If you track RED for every service, you can
  spot most user-facing problems.
- **USE** (for **resources** like CPU, disk, pools): **U**tilization, **S**aturation (queued
  work), **E**rrors. Good for finding *why* a service is unhealthy underneath.

RED tells you the service is slow; USE often tells you the disk is saturated. Use both.

### Correlation with IDs

The pillars are far more powerful **connected**. A **trace id** attached to every log line
and propagated across service calls lets you jump from "this metric spiked" to "this trace
was slow" to "these log lines explain why." Context propagation (passing the trace id
through each call) is what makes an end-to-end story possible.

### Alerting: page on symptoms, not causes

More alerts is not better. Alert on **symptoms users feel** — your **SLOs** (Lesson 2), like
"error rate above budget" or "p99 latency too high" — rather than on every internal cause.
Cause-based alerts ("CPU is 85%") create **alert fatigue** and pages that aren't actionable.
Tie paging to the **error budget**: page a human only for urgent, actionable, user-impacting
problems; everything else is a ticket or a dashboard.

### OpenTelemetry

Historically each vendor had its own agents and formats. **OpenTelemetry (OTel)** is a
vendor-neutral, open standard and toolkit for **generating and collecting** traces, metrics,
and logs, with consistent context propagation. Instrumenting with OTel lets you send
telemetry to whatever backend you choose without re-instrumenting your code — the emerging
default for observability.

# Key Terminology

- **Observability** — understanding internal state from external outputs, including
  unforeseen questions.
- **Monitoring** — watching for known/expected problems.
- **Logs / metrics / traces** — the three pillars of telemetry.
- **Structured logging** — logs as machine-parseable fields (e.g. JSON).
- **Cardinality** — the number of distinct label combinations for a metric (keep it
  bounded).
- **Span / trace** — a timed segment / the full cross-service path of one request.
- **RED** — Rate, Errors, Duration (service metrics).
- **USE** — Utilization, Saturation, Errors (resource metrics).
- **OpenTelemetry** — a vendor-neutral standard for telemetry.

# Options and Trade-offs

| Pillar | Cost | Detail | Best question it answers |
| ------ | ---- | ------ | ------------------------ |
| Metrics | Low | Low (aggregated) | "Is something wrong, and what's the trend?" |
| Traces | Medium (sampled) | Per-request path | "Where in the request did it go wrong?" |
| Logs | High (volume) | Very high | "What exactly happened at this point?" |

# Worked Example

A user reports that checkout "sometimes hangs." Checkout calls cart, pricing, payment, and
inventory services. Where's the problem? Use the three pillars together.

```text
  1. METRICS (RED): checkout p99 latency spiked; error rate normal.
     -> it's slow, not failing. Which downstream is slow?
  2. TRACES: open a slow trace by its trace id:
       checkout 1200ms
         |- cart      20ms
         |- pricing   30ms
         |- payment  1100ms   <-- the time is here
         |- inventory 25ms
  3. LOGS (same trace id): payment logs show "DB connection pool exhausted".
  4. USE (payment's resources): connection pool saturation at 100%.
```

Metrics said "checkout is slow," traces pinpointed **payment** as the culprit hop, logs
explained **why** (pool exhausted), and USE confirmed the saturated resource. Because a
**trace id** tied them together, a vague "sometimes hangs" became a precise root cause in
minutes. That's observability doing its job.

# Real World Analogy

Observability is a hospital monitoring a patient. **Metrics** are the vital-sign monitors —
cheap, continuous numbers (heart rate, blood pressure) that trigger alarms on trends.
**Traces** are following one symptom through the body to find where it originates. **Logs**
are the detailed chart notes at each step. And the **patient id** on every record is the
trace id that lets doctors connect the vitals, the diagnosis, and the notes into one story
instead of three disconnected piles of paper.

# Examples

## Example 1 — Basic: RED metrics on every service

Each service exports Rate, Errors, and Duration. A dashboard shows all three per service, so
a rising error rate or latency is visible at a glance before users complain loudly.

**Why this works:** RED captures the user-facing health of any request-driven service in
three numbers.

## Example 2 — Real-world: tracing a cross-service slowdown

A checkout is slow; a distributed trace reveals 90% of the time is in one downstream call.
Without tracing, engineers would guess; with it, they know exactly which hop to fix.

**Why this works:** traces show *where* time goes across services — the question logs and
metrics alone can't answer in a distributed call.

## Example 3 — Trade-off / pitfall: alert fatigue

A team alerts on every CPU spike and disk blip. On-call is paged 40 times a night, starts
ignoring alerts, and misses the one real outage.

**Why this bites:** alerting on causes instead of user-facing symptoms creates noise. Page on
SLO violations (symptoms), and make everything else a dashboard or ticket.

# Common Mistakes

- **Only monitoring known problems.** Build observability so you can answer *unanticipated*
  questions too.
- **Unstructured logs.** Plain-text logs are hard to search and aggregate; log structured
  fields.
- **High-cardinality metric labels.** Labels like user id explode the number of time series;
  keep labels bounded.
- **No request correlation.** Without a trace id across logs/traces, you can't reconstruct a
  request's story.
- **Alerting on causes, not symptoms.** It creates fatigue; page on SLOs and user impact.

# Best Practices

- **Instrument all three pillars** and **correlate** them with a propagated **trace id**.
- **Track RED for every service and USE for every resource.**
- **Use structured logging** and keep metric **cardinality** under control.
- **Alert on SLOs / symptoms** tied to the **error budget**; make non-urgent signals
  dashboards or tickets.
- **Standardize on OpenTelemetry** so you can switch backends without re-instrumenting.

# Summary

- **Observability** is understanding a system's internal state from its outputs — broader
  than **monitoring**, which watches for known problems.
- The **three pillars**: **logs** (detailed events), **metrics** (cheap aggregated numbers
  for trends/alerts), and **traces** (a request's path across services).
- Measure with **RED** (Rate, Errors, Duration) for services and **USE** (Utilization,
  Saturation, Errors) for resources.
- **Correlate** pillars with a propagated **trace id**, and **alert on symptoms/SLOs**, not
  every cause, to avoid alert fatigue.
- **OpenTelemetry** is the vendor-neutral standard for generating and collecting telemetry.

# Flash Cards

Q: What is the difference between monitoring and observability?
A: Monitoring watches for known, expected problems ("is CPU high?"); observability lets you understand new, unexpected behavior and answer questions you didn't predefine — the "why."

Q: What are the three pillars of observability?
A: Logs (detailed timestamped events), metrics (cheap aggregated numbers over time), and traces (the path of a single request across services).

Q: What do RED and USE stand for?
A: RED = Rate, Errors, Duration (for request-driven services). USE = Utilization, Saturation, Errors (for resources like CPU, disk, and pools).

Q: Why attach a trace id to logs and propagate it across services?
A: So you can correlate metrics, traces, and logs into one story for a single request, jumping from "a metric spiked" to the exact slow trace and the log lines explaining why.

Q: Why alert on symptoms (SLOs) rather than causes?
A: Cause-based alerts (like "CPU 85%") create alert fatigue and non-actionable pages. Alerting on user-facing symptoms tied to SLOs keeps pages meaningful.

Q: What does OpenTelemetry provide?
A: A vendor-neutral standard and toolkit for generating and collecting traces, metrics, and logs with consistent context propagation, so you can switch backends without re-instrumenting.

# Exercises

### Easy
For each question, name which pillar answers it best: (a) "how many requests per second is
this service handling?" (b) "which downstream call made this request slow?" (c) "what was the
exact error message at 02:14?"

### Medium
Design the RED metrics for a payments service and one USE metric for a resource it depends
on. Explain what each would tell you during an incident.

### Challenging
Your on-call is drowning in alerts and missing real incidents. Redesign the alerting strategy
around SLOs and error budgets: what do you page on, what becomes a ticket or dashboard, and
how do the three pillars help you go from alert to root cause?

# Further Reading

- Google, *Site Reliability Engineering* — "Monitoring Distributed Systems" and the golden
  signals: https://sre.google/books/
- OpenTelemetry documentation — https://opentelemetry.io/docs/ (traces, metrics, logs, and
  context propagation).
