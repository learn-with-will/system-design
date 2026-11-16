---
slug: the-modular-monolith
title: "The Modular Monolith"
topic: system-architecture
kind: pattern
summary: "Structure monolithic codebases with strict module boundaries, in-memory domain APIs, and operational simplicity."
tags: [monolith, modular-monolith, architecture, domain-driven-design]
related: [microservices-architecture, bounded-contexts-and-service-boundaries, the-distributed-monolith]
---
> **In one line:** A modular monolith structures an entire application as a single deployable unit with strictly enforced internal module boundaries and domain interfaces.

## The idea
In the rush toward microservices, many engineering organizations suffered from self-inflicted operational complexity: managing Kubernetes clusters, distributed tracing, network latency, and distributed transactions for systems with only a handful of developers.

A **Modular Monolith** provides a compelling alternative. It is an architecture where **the entire system runs as a single deployable process and shares a single database**, but the internal codebase is partitioned into strictly isolated, decoupled modules corresponding to business domain boundaries (e.g., `orders`, `payments`, `inventory`, `users`).

Key architectural rules of a modular monolith:
1. **Private Implementations:** Each module encapsulates its internal database tables, business entities, and helper classes. Other modules are strictly prohibited from importing or querying another module's private tables directly.
2. **Public Module APIs:** Communication between modules occurs strictly through defined in-memory interfaces or public service contracts.
3. **In-Memory Speed & Zero Network Overhead:** When the Orders module calls the Inventory module, it executes as a local, in-memory function call taking nanoseconds—zero network serialization, zero HTTP/gRPC overhead, and zero connection timeouts.
4. **Local ACID Transactions:** When business processes require atomic multi-entity consistency, the system can leverage standard, battle-tested single-database ACID transactions without the complexity of 2PC or sagas.

A well-structured modular monolith delivers the operational simplicity of a single deployment pipeline with the clean domain separation required to extract microservices effortlessly if scale eventually demands it.

## See it
Compare a spaghetti monolith against a strictly bounded modular monolith:

```flow
client: External Client @neutral
api: API Controller @primary
mod-o: Orders Module @green
mod-u: Users Module @green
mod-i: Inventory Module @green
client -> api: Inbound Request
api -> mod-o: In-memory function call
mod-o -> mod-i: In-memory Domain Interface (Nanoseconds!)
mod-o -> mod-u: In-memory Domain Interface
```

```typescript
// Enforcing module boundary in a Modular Monolith
// orders/orders.module.ts
export class OrdersModule {
  // Public domain contract exposed to other modules
  public async createOrder(command: CreateOrderCommand): Promise<OrderResult> {
    // Calls inventory via public interface in-process
    const inStock = await this.inventoryService.checkAvailability(command.items);
    if (!inStock) throw new OutOfStockError();

    // Local single-database ACID transaction!
    return await this.db.transaction(async (trx) => {
      return await this.ordersRepository.insert(command, trx);
    });
  }
}
```

> **Tip:** Use build tools and linting rules (such as ArchUnit in Java, or Nx / project references in TypeScript) to automatically fail CI builds if code in the `orders` module attempts to directly import private files from the `billing` module!

## Go deeper
Shopify, one of the world's largest e-commerce platforms processing hundreds of billions of dollars in gross merchandise volume, famously runs as a massive Ruby on Rails modular monolith. By enforcing strict component boundaries using their open-source tool `packwerk`, they scale hundreds of engineering teams across millions of requests per second within a unified codebase.
## Watch out
- Do not allow modules to bypass public APIs and execute raw SQL JOINs across another module's private tables; this destroys boundaries and creates a Big Ball of Mud.
- Ensure modules communicate asynchronously via internal event emitters for decoupling when immediate transactional consistency is not required.
## Remember
- A modular monolith deploys as a single binary with strictly enforced internal module boundaries.
- Inter-module calls execute in-memory at hardware speed without network latency or serialization.
- Maintain clean boundaries so that individual modules can be extracted into microservices cleanly if scale justifies it.
