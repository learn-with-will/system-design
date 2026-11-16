---
slug: sli-slo-and-sla
title: "SLIs, SLOs & SLAs"
topic: foundations
kind: technique
summary: "Implement Google SRE metrics: Service Level Indicators, Objectives, and Agreements with error budgets."
tags: [sre, sli, slo, sla, error-budget]
related: [availability-and-the-nines, tail-latency-and-percentiles, monitoring-vs-observability]
---
> **In one line:** SLIs measure actual behavior, SLOs define internal reliability targets, and SLAs specify external contractual commitments.

## The idea
In the Google Site Reliability Engineering (SRE) framework, system reliability is governed by three interconnected concepts: Service Level Indicators (SLIs), Service Level Objectives (SLOs), and Service Level Agreements (SLAs).

- **SLI (Service Level Indicator):** A quantifiable, carefully defined metric that measures how well a service is performing in real time. Standard SLIs include request success rate (successful requests divided by total requests) and request latency (percentage of requests served faster than a given threshold).
- **SLO (Service Level Objective):** An internal target reliability level for an SLI over a rolling window (typically 30 days). For example: "99.9% of valid HTTP requests to /api/checkout must return HTTP 200 within 250 milliseconds over any rolling 30-day window." The SLO is agreed upon by engineering and product teams to balance feature velocity with stability.
- **SLA (Service Level Agreement):** A legal, external contract with customers detailing what happens if the service fails to meet agreed standards, typically involving financial penalties, service credits, or contract termination. SLAs are deliberately set looser than internal SLOs (e.g., an internal SLO of 99.9% versus an external SLA of 99.0%) to allow teams to detect and remediate problems before violating legal contracts.

The cornerstone of modern reliability management is the **error budget**:
$$\text{Error Budget} = 100\% - \text{SLO}$$
If an SLO is 99.9%, the error budget is 0.1%. As long as the error budget remains positive, engineering teams can safely deploy features, push experimental updates, and perform schema migrations. When the error budget is exhausted, feature deployments are halted, and team engineering capacity is redirected exclusively to reliability fixes and resilience testing.

## See it
Consider how error budget burn rates guide engineering decision-making:

```flow
budget: 30-Day Error Budget | 100% - SLO @primary
green: Budget Healthy (> 50%) | Ship new features freely @green
amber: Budget Burning (< 20%) | Heightened review & risk gating @amber
red: Budget Exhausted (0%) | Feature freeze; reliability only @red
budget -> green
budget -> amber
budget -> red
```

```yaml
# Prometheus SLO alert rule configuration
groups:
- name: checkout-service-slo
  rules:
  - alert: HighErrorRateBudgetBurn
    expr: |
      (
        sum(rate(http_requests_total{job="checkout",status=~"5.."}[1h]))
        /
        sum(rate(http_requests_total{job="checkout"}[1h]))
      ) > (1 - 0.999) * 14.4 # 14.4x burn rate exhausts budget in 2 days
    for: 2m
    labels:
      severity: page
    annotations:
      summary: "Checkout service burning error budget at 14.4x rate"
```

> **Note:** Alerting on error budget burn rate prevents pager fatigue by waking engineers only when an issue is burning the budget fast enough to risk violating the monthly SLO.

## Go deeper
Good SLIs focus on user-centric outcomes rather than raw machine statistics. Alerting on 95% CPU utilization frequently results in false alarms if users are experiencing sub-50ms latencies with 0% error rates. Conversely, an application with 10% CPU usage might be dropping all database connections due to a dead pool—a critical user-facing outage that machine-level metrics fail to identify.
## Watch out
- Never make your external SLA equal to your internal SLO; always maintain an operational buffer between the two.
- Avoid setting an unrealistic 100% SLO target; 100% reliability is neither achievable nor cost-effective for modern internet systems.
## Remember
- SLI is what you measure; SLO is the internal target; SLA is the contractual commitment.
- The error budget ($100\% - \text{SLO}$) establishes a clear framework balancing feature velocity and reliability.
- Base SLIs on customer-impacting outcomes (latency and error rate) rather than server-side hardware metrics.
