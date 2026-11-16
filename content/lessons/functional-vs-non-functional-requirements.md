---
slug: functional-vs-non-functional-requirements
title: "Functional vs Non-Functional Requirements"
topic: foundations
kind: concept
summary: "Distinguish feature specifications from operational qualities like latency, throughput, and durability."
tags: [requirements, nfr, specifications]
related: [what-is-system-design, reliability-scalability-maintainability, sli-slo-and-sla]
---
> **In one line:** Functional requirements define what a system does; non-functional requirements define how well and reliably it does it.

## The idea
Every system design exercise begins with scoping requirements. Requirements fall into two fundamentally distinct categories: functional requirements and non-functional requirements (NFRs). Conflating the two or neglecting non-functional constraints is the most common cause of architectural failure.

Functional requirements describe features and behavior from the user's perspective. In an e-commerce platform, functional requirements include: "a user can search for items," "a user can add items to a shopping cart," and "a user can complete a checkout." If a requirement can be phrased as an action or business feature, it is functional. These requirements dictate the API contracts, domain entities, and business logic.

Non-functional requirements specify operational qualities, constraints, and system characteristics. These include latency targets, throughput requirements, data durability, availability guarantees, compliance, and cost budgets. In the same e-commerce system, non-functional requirements dictate that search results must render within 150 milliseconds at the 99th percentile, the checkout pipeline must never lose an order, and the service must maintain 99.99% availability during peak holiday traffic. Non-functional requirements drive architectural decisions: whether to use synchronous RPC or message queues, single-leader replication or multi-region active-active clusters.

## See it
The following comparison highlights how functional specifications differ from non-functional architectural drivers:

| Requirement Category | Core Question | Example Requirement | Architectural Implication |
|---|---|---|---|
| **Functional** | What does it do? | User shortens a 2048-char URL | Needs hash generator, schema with `short_code` and `long_url` |
| **Non-Functional: Latency** | How fast? | p99 redirect < 10ms | Needs in-memory cache (Redis) and Edge CDN caching |
| **Non-Functional: Durability** | How safe? | Zero data loss on accepted URLs | Write-ahead logging (WAL) and synchronous replication |
| **Non-Functional: Scale** | How large? | 100M new URLs/year, 10B reads/year | Read-heavy (100:1); scale read replicas independently |

```json
{
  "project": "url-shortener",
  "functional": [
    "POST /api/v1/urls returns a 7-character short token",
    "GET /{token} issues HTTP 302 redirect to original destination"
  ],
  "non_functional": {
    "read_write_ratio": "100:1",
    "p99_latency_redirect_ms": 15,
    "availability_target": 0.9999,
    "retention_years": 5
  }
}
```

> **Tip:** In any technical interview or project kickoff, spend the first five minutes locking down NFRs. A system built for 100 writes/sec looks completely different from one built for 100,000 writes/sec.

## Go deeper
Non-functional requirements frequently conflict. Achieving ultra-low read latency often requires aggressive caching, which can temporarily serve stale data—conflicting with strict consistency requirements. Similarly, achieving five nines of availability across multiple geographical regions introduces network partition challenges and cross-region replication costs. Architectural skill lies in finding the exact compromise required by the business.
## Watch out
- Avoid vague NFR statements like "the system must be fast"; quantify requirements with percentiles like "p95 latency under 200ms".
- Do not omit data durability and backup recovery time targets when specifying database requirements.
## Remember
- Functional requirements define user-facing features and API contracts.
- Non-functional requirements dictate system scale, latency, availability, and durability.
- Architectural complexity is driven primarily by non-functional requirements, not feature count.
