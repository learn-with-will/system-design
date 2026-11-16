---
slug: system-design-interview-framework
title: "The System Design Interview Framework"
topic: system-architecture
kind: technique
summary: "Master the repeatable 4-step framework: Scope, High-Level Design, Deep Dive, and Bottleneck Wrap-Up."
tags: [interview, framework, system-design, architecture]
related: [identifying-read-and-write-paths, validating-and-iterating-designs, functional-vs-non-functional-requirements]
---
> **In one line:** A structured four-step framework—Scope, High-Level Design, Deep Dive, and Wrap-Up—ensures methodical execution in system design interviews.

## The idea
System design interviews and real-world architectural design reviews are intentionally open-ended, ambiguous, and vast. Candidates who immediately jump to the whiteboard and start drawing boxes (e.g., drawing load balancers, Redis caches, and Kafka clusters before clarifying what the system actually does) almost always fail.

To succeed, you must execute a disciplined, repeatable **4-Step Framework**:

**Step 1: Understand the Problem & Scope (5–8 minutes):**
Never assume anything. Clarify requirements aggressively:
- *Functional:* What are the 2–3 core features we must design? What is out of scope?
- *Non-Functional:* What is the scale? How many Daily Active Users (DAU)? What are the read-to-write ratios? What are the latency targets (p99 < 100 ms) and availability goals (99.99%)?
- *Back-of-the-envelope math:* Calculate QPS, peak QPS, bandwidth, and multi-year storage capacity.

**Step 2: High-Level Design (10–15 minutes):**
Draw the bird's-eye view architecture:
- Define the client entry point (DNS, CDN, Load Balancer).
- Establish the API contracts (endpoints, verbs, input/output JSON).
- Outline the core database schema and select database paradigms (SQL vs NoSQL).
- Connect the primary components with directional arrows indicating data flow.

**Step 3: Deep Dive into Critical Components (15–20 minutes):**
The interviewer will guide you toward the system's unique challenges:
- Dive into the primary bottleneck (e.g., handling feed generation for celebrities, or preventing race conditions in distributed seat reservation).
- Detail data partitioning, replication models, caching strategies, and concurrency control.

**Step 4: Wrap-Up & Bottleneck Evaluation (5 minutes):**
Critique your own architecture:
- Identify single points of failure (SPoFs).
- Discuss monitoring, metrics (RED), alerting, and disaster recovery.
- Explain how the design will scale if traffic increases by another 10x.

## See it
Manage your time allocation during a standard 45-minute architectural interview:

```flow
s1: Step 1: Scope & Math (5-8 min) | Functional, NFRs, QPS math @primary
s2: Step 2: High-Level Design (10-15 min) | APIs, schema, core tiers @blue
s3: Step 3: Deep Dive (15-20 min) | Bottlenecks, caching, sharding @green
s4: Step 4: Wrap-Up (5 min) | SPoFs, telemetry, scale limits @amber
s1 -> s2: Scoping complete
s2 -> s3: Architecture defined
s3 -> s4: Deep dive finished
```

```yaml
# System Design Interview Cheatsheet
step_checklist:
  1_clarify:
    - "Who uses this? What are the top 3 features?"
    - "Scale: DAU, Read QPS, Write QPS, Storage per year"
  2_high_level:
    - "Endpoints: POST /api/v1/urls, GET /{code}"
    - "Schema: Primary keys, index strategies"
    - "Diagram: Client -> LB -> App -> Cache / DB"
  3_deep_dive:
    - "How to handle 100,000 QPS hot keys?"
    - "Consistent hashing, failover, consensus"
  4_wrap_up:
    - "Identify remaining bottlenecks"
    - "Monitoring, RED metrics, and SLOs"
```

> **Tip:** Treat the interviewer as a senior engineering peer collaborating on an architectural review. Think out loud, state your assumptions explicitly, and present architectural choices as **trade-offs** rather than absolute truths.

## Go deeper
A common interviewer trap is asking a deceptively simple question like *"Design Twitter"*. Twitter consists of account management, direct messaging, ads, trending topics, video encoding, and timelines. A candidate who tries to design all of Twitter fails immediately. A senior engineer scopes the problem down in step 1: *"Given our 45 minutes, should we focus specifically on posting tweets and rendering the home feed at scale, or focus on search and messaging?"*
## Watch out
- Never begin drawing architectural diagrams before clarifying functional and non-functional requirements.
- Do not defend a flawed design defensively; when the interviewer points out a bottleneck, acknowledge the trade-off and explore alternatives.
## Remember
- Follow the 4-step framework: Scope, High-Level Design, Deep Dive, and Wrap-Up.
- Lock down functional requirements, non-functional targets, and QPS sizing in the first 8 minutes.
- Conclude by self-critiquing your design, identifying SPoFs, and explaining monitoring strategies.
