# glide-mq Examples

Runnable examples for [glide-mq](https://github.com/avifenesh/glide-mq) covering core patterns, framework integrations, advanced features, and real-world use cases.

> If glide-mq is useful to you, consider giving it a star on [GitHub](https://github.com/avifenesh/glide-mq). It helps others discover the project.

## Quick Start

```bash
cd examples/core-basics && npm install && npm start
```

## Prerequisites

- **Node.js** 20+
- **glide-mq** 0.9+ (all examples target this version)
- **Valkey** 7.0+ (except [testing](examples/testing), which runs in-memory)

## Examples

### Core

Self-contained examples demonstrating glide-mq fundamentals. No framework required.

| Example | Description | Key Packages |
|---------|-------------|--------------|
| [core-basics](examples/core-basics) | Queue, Worker, events, progress, retries, bulk operations | `glide-mq` |
| [core-workflows](examples/core-workflows) | FlowProducer, chain, group, chord pipelines | `glide-mq` |
| [core-advanced](examples/core-advanced) | Schedulers, rate limiting, dedup, compression, DLQ | `glide-mq` |

### Framework Integrations

Examples using dedicated `@glidemq/*` packages or direct imports for framework-native integration.

| Example | Framework | Key Packages |
|---------|-----------|--------------|
| [hono-api](examples/hono-api) | Hono | `@glidemq/hono`, `hono` |
| [hono-basic](examples/hono-basic) | Hono | `glide-mq`, `hono` |
| [fastify-api](examples/fastify-api) | Fastify | `@glidemq/fastify`, `fastify` |
| [hapi-api](examples/hapi-api) | Hapi | `@glidemq/hapi`, `@hapi/hapi` |
| [hapi-basic](examples/hapi-basic) | Hapi | `glide-mq`, `@hapi/hapi` |
| [express-basic](examples/express-basic) | Express | `glide-mq`, `express` |
| [express-dashboard](examples/express-dashboard) | Express | `@glidemq/dashboard`, `express` |
| [nestjs-module](examples/nestjs-module) | NestJS | `@glidemq/nestjs`, `@nestjs/core` |
| [koa-basic](examples/koa-basic) | Koa | `glide-mq`, `koa` |
| [nextjs-api-routes](examples/nextjs-api-routes) | Next.js | `glide-mq`, `next` |

### Features

Focused examples for individual glide-mq capabilities.

| Example | Description | Key Packages |
|---------|-------------|--------------|
| [batch-processing](examples/batch-processing) | Process jobs in configurable batches | `glide-mq` |
| [bounded-schedulers](examples/bounded-schedulers) | Bounded repeat and cron schedulers | `glide-mq` |
| [broadcast](examples/broadcast) | Pub/sub broadcast with BroadcastWorker | `glide-mq` |
| [custom-job-ids](examples/custom-job-ids) | User-defined job IDs for dedup and lookup | `glide-mq` |
| [dag-workflows](examples/dag-workflows) | DAG-based workflow dependencies | `glide-mq` |
| [exclude-data](examples/exclude-data) | Exclude payload data from storage | `glide-mq` |
| [lifo-mode](examples/lifo-mode) | Last-in-first-out job processing | `glide-mq` |
| [move-to-waiting-children](examples/move-to-waiting-children) | Pause parent until children complete | `glide-mq` |
| [otel-tracing](examples/otel-tracing) | OpenTelemetry tracing and observability | `glide-mq`, `@opentelemetry/*` |
| [pluggable-serializers](examples/pluggable-serializers) | Custom serializers (MessagePack, CBOR, etc.) | `glide-mq` |
| [repeat-after-complete](examples/repeat-after-complete) | Repeat jobs only after previous completion | `glide-mq` |
| [request-reply](examples/request-reply) | Synchronous job execution with addAndWait | `glide-mq` |
| [serverless-producer](examples/serverless-producer) | Connection pooling for serverless environments | `glide-mq` |
| [step-job-move-to-delayed](examples/step-job-move-to-delayed) | Multi-step jobs with delayed transitions | `glide-mq` |
| [subject-filter](examples/subject-filter) | Subject-based message filtering | `glide-mq` |
| [valkey-cluster](examples/valkey-cluster) | Running glide-mq with Valkey cluster | `glide-mq` |

### Use Cases

Real-world patterns showing how to solve common problems with glide-mq.

| Example | Description | Key Packages |
|---------|-------------|--------------|
| [email-service](examples/email-service) | Email queue with retries and dead-letter handling | `glide-mq` |
| [image-pipeline](examples/image-pipeline) | Image resize pipeline with progress tracking | `glide-mq` |
| [webhook-delivery](examples/webhook-delivery) | Reliable webhook delivery with exponential backoff | `glide-mq` |
| [cron-scheduler](examples/cron-scheduler) | Scheduled tasks with cron expressions | `glide-mq` |
| [http-proxy](examples/http-proxy) | HTTP request proxy with queue-based dispatch | `glide-mq`, `express` |
| [iam-auth](examples/iam-auth) | IAM-authenticated Valkey connections | `glide-mq` |
| [testing](examples/testing) | In-memory TestQueue and TestWorker for unit tests | `glide-mq` |

## Ecosystem

| Package | Description |
|---------|-------------|
| [glide-mq](https://github.com/avifenesh/glide-mq) | Core queue library -- producers, workers, schedulers, workflows |
| [@glidemq/hono](https://github.com/avifenesh/glidemq-hono) | Hono middleware -- REST API + SSE for queue management |
| [@glidemq/fastify](https://github.com/avifenesh/glidemq-fastify) | Fastify plugin -- REST API + SSE for queue management |
| [@glidemq/dashboard](https://github.com/avifenesh/glidemq-dashboard) | Express middleware -- web UI for monitoring queues |
| [@glidemq/nestjs](https://github.com/avifenesh/glidemq-nestjs) | NestJS module -- decorators, DI, lifecycle management |
| [@glidemq/hapi](https://github.com/avifenesh/glidemq-hapi) | Hapi plugin -- REST API + SSE for queue management |
| [@glidemq/speedkey](https://github.com/avifenesh/speedkey) | Valkey GLIDE client with native NAPI bindings |
| **glidemq-examples** | This repository |

> Like what you see? [Star glide-mq on GitHub](https://github.com/avifenesh/glide-mq) to help the project grow.

## Documentation

| Guide | Topics |
|-------|--------|
| [Usage](https://github.com/avifenesh/glide-mq/blob/main/docs/USAGE.md) | Queue and Worker basics, graceful shutdown, cluster mode |
| [Advanced](https://github.com/avifenesh/glide-mq/blob/main/docs/ADVANCED.md) | Schedulers, rate limiting, dedup, compression, retries, DLQ |
| [Workflows](https://github.com/avifenesh/glide-mq/blob/main/docs/WORKFLOWS.md) | FlowProducer, chain, group, chord pipelines |
| [Broadcast](https://github.com/avifenesh/glide-mq/blob/main/docs/BROADCAST.md) | Pub/sub broadcast, subject filtering, BroadcastWorker |
| [Serverless](https://github.com/avifenesh/glide-mq/blob/main/docs/SERVERLESS.md) | ServerlessPool, connection reuse, Lambda/Cloud Functions |
| [Step Jobs](https://github.com/avifenesh/glide-mq/blob/main/docs/STEP_JOBS.md) | Multi-step processors, delayed transitions, state machines |
| [Testing](https://github.com/avifenesh/glide-mq/blob/main/docs/TESTING.md) | In-memory TestQueue and TestWorker |
| [Observability](https://github.com/avifenesh/glide-mq/blob/main/docs/OBSERVABILITY.md) | OpenTelemetry, job logs, dashboard integration |
| [Migration](https://github.com/avifenesh/glide-mq/blob/main/docs/MIGRATION.md) | Coming from BullMQ? API mapping and migration guide |
| [Architecture](https://github.com/avifenesh/glide-mq/blob/main/docs/ARCHITECTURE.md) | Internals, Lua functions, key layout, cluster design |

## Contributing

Each example must be self-contained with its own `package.json`, `tsconfig.json`, and `README.md`. All examples must pass `tsc --noEmit` before merging.

## License

Apache-2.0
