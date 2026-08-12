# System Design Learning Portal

A **frontend-only** System Design course: read Markdown lessons, take quizzes, and
track your progress — all in the browser. No sign-up, no backend.

## What this is

The portal shell is built with React 19, Vite, TypeScript, React Router,
Tailwind CSS v4, `marked`, and PrismJS. It renders a **24-lesson curriculum** covering
the fundamentals of system design, from requirements and estimation to scaling,
distributed data, resilience, and operating a system in production. Every lesson is
written in plain, welcoming English and verified against primary sources (see
**Sources** below).

Progress, bookmarks, and quiz scores live in `localStorage` under
`system-design-learning-*` keys, so nothing leaves your machine.

## Run it locally

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build
```

## How the content works

The app is **data-driven** — adding a lesson needs no code changes:

1. Write the lesson Markdown in `public/content/<level>/<slug>.md` with YAML front-matter.
2. Add a matching entry to `public/content/course-manifest.json`.
3. Add a quiz at `public/quizzes/lesson-NN.json`.

> **Code fences** must declare one of the highlighted languages: `bash`, `json`,
> `yaml`, `sql`, `http`, or `text` (diagrams and terminal output use `text`; see
> `src/core/prism.ts`).

## Curriculum

**Beginner — foundations:** what system design is · scalability, availability &
performance · back-of-the-envelope estimation · how the internet works · designing
APIs · SQL vs NoSQL storage · caching · load balancing & reverse proxies.

**Intermediate — data & distribution:** scaling out & statelessness · database
replication · partitioning (sharding) · consistency models · CAP & PACELC · messaging
& event streaming · idempotency, retries & timeouts · rate limiting & API gateways.

**Advanced — architecture & operations:** monoliths vs microservices · resilience
patterns · distributed transactions (saga, 2PC, outbox) · consensus & coordination ·
designing for failure · observability · security essentials · a capstone that designs
a system end to end.

## Accuracy: no hallucination

Every definition, guarantee, trade-off, and number is verified against primary
sources. The per-lesson authoring contract lives in
`prompts/system-design-authoring-prompt.md`, and the phase-by-phase overview in
`prompts/system-design-study-pathway.md`.

**Sources:**

- **Designing Data-Intensive Applications** (Martin Kleppmann, O'Reilly) — the primary
  anchor for storage, replication, partitioning, consistency, and streaming.
- **Google SRE book** — <https://sre.google/books/> (reliability, SLOs, observability).
- **Foundational papers** — Gilbert & Lynch (CAP), Brewer "CAP Twelve Years Later",
  Abadi (PACELC), Amazon Dynamo, Raft, and Lamport's "Paxos Made Simple".
- **Standards & references** — MDN, and the IETF RFCs for HTTP (9110), TLS 1.3 (8446),
  and OAuth 2.0 (6749).
- **Patterns** — microservices.io (Chris Richardson) and Michael Nygard's *Release It!*
- **Official docs** where a concrete system is named — PostgreSQL, Redis, Apache Kafka,
  NGINX, etcd, and OpenTelemetry.

## Deploying

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds with
`BASE_PATH=/<repo>/` and publishes `dist/` to GitHub Pages.

---

React 19 · Vite · TypeScript · React Router · Tailwind CSS v4 · marked · PrismJS ·
localStorage.
