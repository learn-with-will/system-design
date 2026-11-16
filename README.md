# System Design Learn

A self-paced, content-only course on modern distributed system design, built on the shared [course-shell](https://github.com/learn-with-will/course-shell).
103 micro-lessons (bite-sized, 3–5 minutes each across 12 topics) with 150 interactive practice questions.

**Live:** <https://learn-with-will.github.io/system-design/>

> Scope: core design principles, capacity estimation & back-of-the-envelope math, networking protocols & CDNs, load balancing & reverse proxies, storage paradigms & caching tiers, replication topologies & consensus algorithms (Paxos, Raft), partitioning & consistent hashing, distributed consistency & transactions (CAP, PACELC, 2PC, Saga), messaging queues & event-driven streaming, resilience patterns (circuit breakers, rate limiting, bulkheads), observability & chaos engineering, and end-to-end interview architectures. Every concept is grounded in production realities and distributed systems literature — see [`prompts/system-design-authoring-prompt.md`](prompts/system-design-authoring-prompt.md).

## Course layout

```text
course.json                    course metadata, brand styling, code languages
content/topics.json            the 12 curriculum topics
content/lessons/*.md           103 bite-sized micro-lessons (3–5 min each)
content/legacy.json            backward compatibility redirect map for 24 legacy lessons
quiz/questions.json            150 practice questions (all five question types)
prompts/                       authoring prompt and domain guidelines
.github/workflows/deploy.yml   thin deployment workflow invoking course-shell
```

## Develop and validate

This repository contains content only. Development and validation run through `course-shell`:

```bash
# Validate content strictly against bite rules and schema
npm --prefix ../course-shell run validate -- ../system-design --strict

# Run dev server with hot reload
npm --prefix ../course-shell run dev -- ../system-design

# Build static production bundle
npm --prefix ../course-shell run build -- ../system-design
```

## Deploy

Pushing to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which uses the shared [`deploy-course.yml`](https://github.com/learn-with-will/course-shell/blob/main/.github/workflows/deploy-course.yml) workflow from `course-shell` to validate, build, and deploy to GitHub Pages.
