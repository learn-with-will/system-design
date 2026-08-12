---
id: lesson-02
slug: scalability-availability-and-performance
title: "Scalability, Availability & Performance"
level: beginner
order: 2
duration: 22
tags:
  - scalability
  - availability
  - latency
  - throughput
  - slo
---

# Learning Objectives

By the end of this lesson you will be able to:

- Define **latency** and **throughput** and explain how they differ.
- Explain why we describe performance with **percentiles** (like p99) instead of averages.
- Read an **availability** figure ("three nines") as real downtime.
- Tell **scaling up** from **scaling out**.
- Explain what **SLI**, **SLO**, and **SLA** mean and how they relate.

# Why It Matters

"It's fast" and "it's always up" are not requirements — they are wishes. To design a
system you need to turn those wishes into numbers you can measure and check. This lesson
gives you the vocabulary that every later lesson assumes: what "fast" and "reliable"
actually mean, and how engineers put numbers on them.

# Concept Explanation

### Latency vs throughput

- **Latency** is how long *one* request takes, from sending it to getting the response.
  You measure it in time (milliseconds).
- **Throughput** is how *many* requests the system completes per unit of time. You
  measure it in requests per second (or per minute).

They are related but not the same. A checkout lane at a store has a **latency** (how long
one customer takes) and a **throughput** (customers served per hour). Adding more lanes
raises throughput without making any single customer faster. A common mistake is to
optimize one and forget the other; requirements usually name both.

### Why percentiles, not averages

If you measure the latency of many requests and report the **average**, you hide the
worst experiences. Imagine 99 requests take 10 ms and one takes 3 seconds. The average is
about 40 ms — which describes *nobody's* actual experience.

So engineers use **percentiles**. The **p50** (median) is the value half of requests beat.
The **p99** ("99th percentile") is the value 99% of requests beat — the slow **tail** that
1% of users actually feel. As *Designing Data-Intensive Applications* points out, tail
latencies matter because the slowest requests often hit your most valuable, most active
users, and because one slow call can hold up a whole page. Design and measure against a
**tail percentile** (p95, p99, or p99.9), not the average.

### Availability and the "nines"

**Availability** is the fraction of time a system is up and serving. People say it in
"nines." The trick is to translate a percentage into real downtime, because each extra
nine is roughly **ten times** harder and more expensive:

| Availability | Downtime per year | Downtime per day |
| ------------ | ----------------- | ---------------- |
| 99% ("two nines") | ~3.65 days | ~14.4 minutes |
| 99.9% ("three nines") | ~8.77 hours | ~1.44 minutes |
| 99.99% ("four nines") | ~52.6 minutes | ~8.6 seconds |
| 99.999% ("five nines") | ~5.26 minutes | ~0.86 seconds |

(These use a 365.25-day year ≈ 8766 hours.) Notice that "99.9% available" still allows
almost nine hours of downtime a year. Whether that is fine or a disaster depends entirely
on the system — which is why availability is a *requirement to agree on*, not a default.

### Scaling up vs scaling out

When load grows, you have two directions:

- **Scale up (vertical):** use a bigger machine — more CPU, RAM, faster disk. Simple, but
  there is a ceiling (the biggest machine you can buy) and it is a single point of
  failure.
- **Scale out (horizontal):** use *more* machines and spread the work across them. This
  has (almost) no ceiling and can be made fault-tolerant, but it introduces the hard
  parts of distributed systems — which is most of this course. We go deep on scaling out
  in a later lesson.

### Putting numbers on reliability: SLI, SLO, SLA

Google's Site Reliability Engineering practice gives us three precise terms:

- **SLI — Service Level Indicator:** a *measured* number about the service, e.g. "the
  percentage of requests served in under 200 ms" or "the percentage of requests that
  succeed."
- **SLO — Service Level Objective:** a *target* for an SLI, e.g. "99.9% of requests
  succeed over 30 days." This is the internal goal the team designs and operates toward.
- **SLA — Service Level Agreement:** a *contract* with customers that includes
  consequences (refunds, credits) if objectives are missed. An SLA is usually looser
  than the internal SLO, so you notice trouble before you breach the contract.

A helpful idea that falls out of an SLO is the **error budget**: if your SLO is 99.9%
success, then 0.1% failure is *allowed* — that budget is how much risk you can spend on
changes and new releases.

# Key Terminology

- **Latency** — time for a single request to complete.
- **Throughput** — requests completed per unit of time.
- **Percentile (p50, p99)** — the value that a given fraction of requests come in under;
  p99 describes the slow tail.
- **Tail latency** — the latency of the slowest requests (high percentiles).
- **Availability** — the fraction of time the system is up and serving, often stated in
  "nines."
- **Vertical scaling (scale up)** — a bigger single machine.
- **Horizontal scaling (scale out)** — more machines sharing the load.
- **SLI** — a measured indicator of service quality.
- **SLO** — the target you hold the SLI to.
- **SLA** — a customer contract with consequences for missing objectives.
- **Error budget** — the amount of failure an SLO permits (100% − SLO).

# Options and Trade-offs

| Lever | Improves | Cost / limit |
| ----- | -------- | ------------ |
| Scale up (bigger box) | Throughput, simplicity | Hard ceiling; single point of failure; price rises steeply |
| Scale out (more boxes) | Throughput, fault tolerance | Distributed-systems complexity (this whole course) |
| Add a cache | Latency, read throughput | Data can be stale; extra moving part |
| Chase more "nines" | Availability | Each nine ≈ 10× the effort and cost |
| Tighten the SLO | User-perceived reliability | Slows releases; shrinks the error budget |

# Worked Example

A team says their API is "fast — about 50 ms on average." Traffic is 2,000 requests per
second. Should they be happy?

First, restate it in measurable terms. Average latency hides the tail, so ask for
percentiles. Suppose the real numbers are:

```text
  p50  =  20 ms     (half of requests beat this)
  p95  = 120 ms
  p99  = 800 ms     (1% of requests are this slow or slower)
  avg  =  50 ms     (dragged up by the slow tail)
```

At 2,000 requests/second, **1% of requests is 20 requests every second** experiencing
≥ 800 ms. Those 20 users/second are disproportionately your heaviest users, and if a
single page makes several API calls, the chance that *at least one* is slow climbs fast.
The "50 ms average" was true and also misleading. The fix is to set an SLO on a tail
percentile — for example, "p99 latency under 200 ms" — and design and measure against
that.

# Real World Analogy

Think of a call center. **Latency** is how long one caller waits on hold. **Throughput**
is how many callers the center handles per hour. Reporting the *average* hold time hides
the caller who waited 40 minutes — so managers watch the **95th-percentile** wait
instead. The promise on the website ("we answer 95% of calls within 2 minutes") is the
**SLA**; the stricter internal goal the managers actually staff for is the **SLO**; the
live "percent answered within 2 minutes" dashboard is the **SLI**.

# Examples

## Example 1 — Basic: latency and throughput are different

A batch job processes one record in 5 ms and can run 200 records/second on one thread.
Running eight threads barely changes the 5 ms per record (latency) but pushes throughput
toward 1,600 records/second.

**Why this works:** parallelism raises throughput without lowering per-item latency.
They are separate dials.

## Example 2 — Real-world: choosing an availability target

An internal analytics dashboard and a payments API do not need the same availability.
Five nines for the dashboard would cost enormous effort for no real benefit; the payments
API might genuinely need four. The right target comes from the *cost of downtime*, not
from wanting the biggest number.

**Why this works:** availability is a requirement to justify, and each extra nine is
about ten times harder — so you buy only what the use case is worth.

## Example 3 — Trade-off / pitfall: reporting the average

A service reports "average latency 40 ms" and everyone relaxes, but the p99 is 2 seconds
and users complain the app "feels laggy." The average was mathematically true and
practically useless.

**Why this bites:** averages hide the tail. The users who churn are usually in the tail,
so the number you celebrate is the number that doesn't matter.

# Common Mistakes

- **Reporting averages for latency.** Always look at a tail percentile (p95/p99).
- **Confusing latency and throughput.** Making each request faster and handling more
  requests are different goals with different fixes.
- **Chasing nines you don't need.** Each extra nine costs roughly 10× more; match the
  target to the cost of downtime.
- **Mixing up SLI, SLO, and SLA.** The SLI is measured, the SLO is your target, the SLA
  is the customer contract — and the SLA is usually looser than the SLO.

# Best Practices

- **State performance as a percentile with a number:** "p99 < 200 ms," not "fast."
- **Set an SLO** on the SLIs users actually feel (latency, success rate), and watch your
  **error budget**.
- **Pick an availability target from the cost of downtime**, then design for it.
- **Track latency and throughput together**; improving one can quietly hurt the other.

# Summary

- **Latency** is per-request time; **throughput** is requests per unit time. They are
  related but distinct.
- Report performance with **percentiles** (p99), because **averages hide the slow tail**
  that users actually feel.
- **Availability** in "nines" translates to real downtime — 99.9% is still ~8.8 hours a
  year — and every extra nine is roughly 10× harder.
- **Scale up** = bigger machine (has a ceiling); **scale out** = more machines (adds
  distributed complexity).
- **SLI** is measured, **SLO** is the target, **SLA** is the customer contract; the gap
  below your SLO is the **error budget**.

# Flash Cards

Q: What is the difference between latency and throughput?
A: Latency is how long one request takes; throughput is how many requests complete per unit of time.

Q: Why do we report p99 latency instead of the average?
A: Averages hide the slow tail. p99 tells you what the slowest 1% of requests experience — often your most active users.

Q: Roughly how much downtime per year does 99.9% availability allow?
A: About 8.77 hours per year (three nines).

Q: What is the difference between an SLO and an SLA?
A: An SLO is your internal target for a metric; an SLA is a customer contract with consequences. The SLA is usually looser than the SLO.

Q: What is an error budget?
A: The amount of failure an SLO permits — 100% minus the SLO. A 99.9% SLO gives a 0.1% error budget to spend on risk and change.

Q: What is the difference between scaling up and scaling out?
A: Scaling up means a bigger single machine (limited, single point of failure); scaling out means more machines sharing the load (unlimited-ish, but adds distributed complexity).

# Exercises

### Easy
Convert these availability targets to approximate downtime per year: 99%, 99.9%,
99.99%. Which one would you require for a hospital's patient-records system, and why?

### Medium
A service reports avg = 30 ms, p50 = 15 ms, p99 = 1,200 ms at 5,000 requests/second. How
many requests per second are experiencing ≥ 1,200 ms? Write an SLO you would set, and say
why you chose that percentile.

### Challenging
Your product currently meets a 99.9% availability SLO. Leadership wants to advertise
99.999%. List what that change would demand (design, testing, on-call, cost) and argue
whether it is worth it for a photo-filter app versus a stock-trading platform.

# Further Reading

- Martin Kleppmann, *Designing Data-Intensive Applications*, Chapter 1 — "Describing
  Performance" (percentiles and tail latency).
- Google, *Site Reliability Engineering* — https://sre.google/books/ — "Service Level
  Objectives" and "Embracing Risk" (error budgets).
