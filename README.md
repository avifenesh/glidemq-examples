# glide-mq Examples

[![docs](https://img.shields.io/badge/docs-glide--mq.dev-6366f1)](https://avifenesh.github.io/glide-mq.dev/)

Runnable examples for [glide-mq](https://github.com/avifenesh/glide-mq) covering core patterns, framework integrations, advanced features, and real-world use cases.

**[Full documentation](https://avifenesh.github.io/glide-mq.dev/examples/)** | **[Core docs](https://avifenesh.github.io/glide-mq.dev/guide/getting-started)**

> If glide-mq is useful to you, consider giving it a star on [GitHub](https://github.com/avifenesh/glide-mq). It helps others discover the project.

## Quick Start

```bash
cd examples/core-basics && npm install && npm start
```

## Prerequisites

- **Node.js** 20+
- **glide-mq** 0.13+ (some older examples work with 0.9+)
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

### AI-Native (glide-mq 0.13+)

18 AI-native examples now live in the [main glide-mq repo](https://github.com/avifenesh/glide-mq/tree/main/examples). These cover the full AI orchestration surface:

| Example | Description |
|---------|-------------|
| [usage-tracking](https://github.com/avifenesh/glide-mq/blob/main/examples/usage-tracking.ts) | Token/cost tracking with `reportUsage` and `getFlowUsage` |
| [token-streaming](https://github.com/avifenesh/glide-mq/blob/main/examples/token-streaming.ts) | Real-time streaming with `job.stream`, `readStream`, SSE |
| [human-approval](https://github.com/avifenesh/glide-mq/blob/main/examples/human-approval.ts) | Human-in-the-loop with `suspend` and `signal` |
| [model-failover](https://github.com/avifenesh/glide-mq/blob/main/examples/model-failover.ts) | Ordered model/provider fallback chains |
| [budget-cap](https://github.com/avifenesh/glide-mq/blob/main/examples/budget-cap.ts) | Flow-level token and cost budget caps |
| [tpm-throttle](https://github.com/avifenesh/glide-mq/blob/main/examples/tpm-throttle.ts) | Dual-axis rate limiting (RPM + TPM) |
| [vector-search](https://github.com/avifenesh/glide-mq/blob/main/examples/vector-search.ts) | Vector search over jobs with `createJobIndex` |
| [ai-agent-loop](https://github.com/avifenesh/glide-mq/blob/main/examples/ai-agent-loop.ts) | Autonomous agent loop pattern |
| [rag-pipeline](https://github.com/avifenesh/glide-mq/blob/main/examples/rag-pipeline.ts) | RAG pipeline with embedding and retrieval |
| [embedding-pipeline](https://github.com/avifenesh/glide-mq/blob/main/examples/embedding-pipeline.ts) | Batch embedding generation |
| [content-pipeline](https://github.com/avifenesh/glide-mq/blob/main/examples/content-pipeline.ts) | Multi-stage content generation |
| [agent-memory](https://github.com/avifenesh/glide-mq/blob/main/examples/agent-memory.ts) | Agent memory and context management |
| [adaptive-timeout](https://github.com/avifenesh/glide-mq/blob/main/examples/adaptive-timeout.ts) | Adaptive timeouts for LLM calls |
| [with-langchain](https://github.com/avifenesh/glide-mq/blob/main/examples/with-langchain.ts) | LangChain integration |
| [with-vercel-ai-sdk](https://github.com/avifenesh/glide-mq/blob/main/examples/with-vercel-ai-sdk.ts) | Vercel AI SDK integration |
| [search-dashboard](https://github.com/avifenesh/glide-mq/blob/main/examples/search-dashboard.ts) | Search dashboard with vector queries |
| [llm](https://github.com/avifenesh/glide-mq/blob/main/examples/llm.ts) | Basic LLM call orchestration |
| [testing-mode](https://github.com/avifenesh/glide-mq/blob/main/examples/testing-mode.ts) | In-memory testing for AI workflows |

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
| [glide-mq](https://github.com/avifenesh/glide-mq) | AI-native queue library -- orchestration, streaming, failover, budget caps |
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
| [Step Jobs](https://github.com/avifenesh/glide-mq/blob/main/docs/STEP_JOBS.md) | Multi-step processors, delayed transitions, dynamic children |
| [Serverless](https://github.com/avifenesh/glide-mq/blob/main/docs/SERVERLESS.md) | ServerlessPool, connection reuse, Lambda/Cloud Functions |
| [Testing](https://github.com/avifenesh/glide-mq/blob/main/docs/TESTING.md) | In-memory TestQueue and TestWorker |
| [Observability](https://github.com/avifenesh/glide-mq/blob/main/docs/OBSERVABILITY.md) | OpenTelemetry, job logs, dashboard integration |
| [Migration](https://github.com/avifenesh/glide-mq/blob/main/docs/MIGRATION.md) | Coming from BullMQ? API mapping and migration guide |
| [Architecture](https://github.com/avifenesh/glide-mq/blob/main/docs/ARCHITECTURE.md) | Internals, Lua functions, key layout, cluster design |

## Contributing

Each example must be self-contained with its own `package.json`, `tsconfig.json`, and `README.md`. All examples must pass `tsc --noEmit` before merging.

## License

Apache-2.0
