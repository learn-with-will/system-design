---
slug: bounded-contexts-and-service-boundaries
title: "Bounded Contexts & Service Boundaries"
topic: system-architecture
kind: technique
summary: "Apply Domain-Driven Design (DDD) to draw natural microservice boundaries using Bounded Contexts and Conway's Law."
tags: [domain-driven-design, bounded-contexts, service-boundaries, microservices]
related: [the-modular-monolith, microservices-architecture, the-distributed-monolith]
---
> **In one line:** Bounded contexts define explicit semantic boundaries within which a domain model applies, establishing natural seams for microservices.

## The idea
The most difficult and critical decision in microservices architecture is: **Where do you draw the lines between services?**

Naive teams frequently draw boundaries along technical layers (e.g., an "UI Service", a "Business Logic Service", and a "Database CRUD Service") or along entity nouns (e.g., a single "User Service" that manages everything related to users). Both approaches fail catastrophically: technical layers force every feature to touch every service, while a universal "User Service" becomes a bloated, heavily coupled bottleneck touched by every team in the company.

**Domain-Driven Design (DDD) & Bounded Contexts:**
Introduced by Eric Evans, **Bounded Contexts** provide the disciplined method for finding natural service boundaries:
- A model has meaning only within a specific context. The word **"User"** or **"Product"** means fundamentally different things to different departments:
  - In the *Identity Context*, a User is credentials, passwords, and MFA tokens.
  - In the *Billing Context*, a User is a customer with credit cards and billing addresses.
  - In the *Support Context*, a User is a ticket requester with chat history.
  - In the *Catalog Context*, a Product is title, dimensions, photos, and descriptions.
  - In the *Warehouse Context*, a Product is a physical barcode, weight, pallet location, and customs code.

By creating separate services around **Bounded Contexts** (e.g., Billing Service vs Identity Service), each service models only the attributes it cares about. There is no single bloated shared `User` class!

**Conway's Law:**
*"Organizations which design systems are constrained to produce designs which are copies of the communication structures of these organizations."* (Melvin Conway, 1968).
Align microservice boundaries with autonomous cross-functional product teams (e.g., the Checkout Team owns the Order Service; the Logistics Team owns the Warehouse Service).

## See it
Consider how the polymorphic concept of a "Product" splits naturally across Bounded Contexts:

```tree
Product Concept Across Bounded Contexts
  Catalog Context (Discovery Team)
    [Catalog] Product | Title, photos, markdown description @green
  Warehouse Context (Logistics Team)
    [Warehouse] Item | Barcode SKU, weight in kg, pallet bin @blue
  Pricing Context (Finance Team)
    [Pricing] SKU | Base cost, VAT tax rule, margin @amber
```

```yaml
# Domain-Driven Context Mapping definition
context_mapping:
  sales_context:
    service: order_management_service
    ubiquitous_language:
      order: "A confirmed purchase agreement with total price and currency"
  fulfillment_context:
    service: shipping_logistics_service
    ubiquitous_language:
      order: "A package manifest requiring physical carrier dispatch"
```

> **Tip:** If two services constantly require synchronous two-phase commits, shared database tables, or simultaneous deployments to ship a feature, **you drew the boundary in the wrong place!** Merge them into a single service.

## Go deeper
Services communicate across bounded contexts using **Anti-Corruption Layers (ACLs)**: translation adapters that convert an external service's data models into the local domain's ubiquitous language, insulating the internal domain model from upstream vendor changes.
## Watch out
- Do not create nano-services with 50 lines of code doing single CRUD operations; services should represent rich business capabilities.
- Avoid a universal "shared enterprise model"; sharing common domain classes across microservice repositories reintroduces compile-time coupling.
## Remember
- Draw service boundaries around Domain-Driven Design Bounded Contexts, not technical layers.
- Different business domains model the same real-world entity with different attributes and rules.
- Align service ownership with organizational team structures per Conway's Law.
