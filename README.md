# glide-mq Examples

A collection of examples showing how to use [glide-mq](https://github.com/avifenesh/glide-mq) with various Node.js frameworks and libraries.

**glide-mq** is a high-performance message queue for Node.js, powered by Valkey/Redis Streams and a Rust-native NAPI client. 1 RTT per job, 48k jobs/s throughput, cluster-native, cloud-ready.

## Ecosystem

| Package | Description |
|---------|-------------|
| [glide-mq](https://github.com/avifenesh/glide-mq) | Core queue library - producers, workers, schedulers, workflows |
| [@glidemq/hono](https://github.com/avifenesh/glidemq-hono) | Hono middleware - REST API + SSE events for queue management |
| [@glidemq/dashboard](https://github.com/avifenesh/glidemq-dashboard) | Express middleware - web UI for monitoring and managing queues |
| [@glidemq/nestjs](https://github.com/avifenesh/glidemq-nestjs) | NestJS module - decorators, DI, lifecycle management |
| [@glidemq/speedkey](https://github.com/avifenesh/speedkey) | Valkey GLIDE client with native NAPI bindings |
| **glidemq-examples** | Examples and integrations (you are here) |

## Examples

### Core

Self-contained examples demonstrating glide-mq's core features. No framework required.

| Example | What you'll learn | Docs |
|---------|-------------------|------|
| [core-basics](examples/core-basics) | Queue, Worker, events, progress, retries, bulk ops | [Usage](https://github.com/avifenesh/glide-mq/blob/main/docs/USAGE.md) |
| [core-workflows](examples/core-workflows) | FlowProducer, chain, group pipelines | [Workflows](https://github.com/avifenesh/glide-mq/blob/main/docs/WORKFLOWS.md) |
| [core-advanced](examples/core-advanced) | Schedulers, rate limiting, dedup, compression, DLQ | [Advanced](https://github.com/avifenesh/glide-mq/blob/main/docs/ADVANCED.md) |

### Framework Integrations

Examples using dedicated `@glidemq/*` packages that provide framework-native integration.

| Example | Framework | Package | What you'll learn |
|---------|-----------|---------|-------------------|
| [hono-api](examples/hono-api) | Hono | [`@glidemq/hono`](https://github.com/avifenesh/glidemq-hono) | REST API + SSE + RPC client + registry pattern |
| [express-dashboard](examples/express-dashboard) | Express | [`@glidemq/dashboard`](https://github.com/avifenesh/glidemq-dashboard) | Web UI dashboard for monitoring queues |
| [nestjs-module](examples/nestjs-module) | NestJS | [`@glidemq/nestjs`](https://github.com/avifenesh/glidemq-nestjs) | Decorators, DI, processors, worker events |

### Framework Usage (direct import)

These frameworks need no special package - just `import { Queue, Worker } from 'glide-mq'`.

| Example | Framework | Status |
|---------|-----------|--------|
| [hono-basic](examples/hono-basic) | Hono | Ready |
| [express-basic](examples/express-basic) | Express | [Planned (#3)](https://github.com/avifenesh/glidemq-examples/issues/3) |
| [koa-basic](examples/koa-basic) | Koa | [Planned (#4)](https://github.com/avifenesh/glidemq-examples/issues/4) |
| [nextjs-api-routes](examples/nextjs-api-routes) | Next.js | [Planned (#5)](https://github.com/avifenesh/glidemq-examples/issues/5) |

### Planned Framework Packages

Full framework integration packages to be built as separate repos.

| Framework | Package | Status | Issue |
|-----------|---------|--------|-------|
| NestJS | [`@glidemq/nestjs`](https://github.com/avifenesh/glidemq-nestjs) | Ready | [#1](https://github.com/avifenesh/glidemq-examples/issues/1) |
| Fastify | `@glidemq/fastify` | Planned | [#2](https://github.com/avifenesh/glidemq-examples/issues/2) |

### Use Case Examples

Real-world patterns showing how to solve common problems with glide-mq.

| Example | Description | Status |
|---------|-------------|--------|
| [email-service](examples/email-service) | Email queue with retries and DLQ | [Planned (#6)](https://github.com/avifenesh/glidemq-examples/issues/6) |
| [image-processing](examples/image-processing) | Image resize pipeline with progress | [Planned (#7)](https://github.com/avifenesh/glidemq-examples/issues/7) |
| [webhook-delivery](examples/webhook-delivery) | Reliable webhook delivery with backoff | [Planned (#8)](https://github.com/avifenesh/glidemq-examples/issues/8) |
| [cron-scheduler](examples/cron-scheduler) | Scheduled tasks with cron expressions | [Planned (#9)](https://github.com/avifenesh/glidemq-examples/issues/9) |
| [request-reply](examples/request-reply) | Synchronous job execution with addAndWait | [Planned (#10)](https://github.com/avifenesh/glidemq-examples/issues/10) |
| [opentelemetry](examples/opentelemetry) | Tracing and observability setup | [Planned (#11)](https://github.com/avifenesh/glidemq-examples/issues/11) |
| [testing](examples/testing) | In-memory TestQueue/TestWorker | [Planned (#12)](https://github.com/avifenesh/glidemq-examples/issues/12) |
| [cluster-mode](examples/cluster-mode) | Running with Valkey cluster | [Planned (#13)](https://github.com/avifenesh/glidemq-examples/issues/13) |

## Quick Start

```bash
# Pick an example
cd examples/core-basics

# Install and run
npm install
npm start
```

## Prerequisites

- Node.js 20+
- Valkey 7.0+ or Redis 7.0+ (except [testing](examples/testing) examples which run in-memory)

## Documentation

| Guide | What you'll learn |
|-------|-------------------|
| [Usage](https://github.com/avifenesh/glide-mq/blob/main/docs/USAGE.md) | Queue & Worker basics, graceful shutdown, cluster mode |
| [Advanced](https://github.com/avifenesh/glide-mq/blob/main/docs/ADVANCED.md) | Schedulers, rate limiting, dedup, compression, retries & DLQ |
| [Workflows](https://github.com/avifenesh/glide-mq/blob/main/docs/WORKFLOWS.md) | FlowProducer, chain, group, chord pipelines |
| [Testing](https://github.com/avifenesh/glide-mq/blob/main/docs/TESTING.md) | In-memory TestQueue & TestWorker |
| [Observability](https://github.com/avifenesh/glide-mq/blob/main/docs/OBSERVABILITY.md) | OpenTelemetry, job logs, dashboard |
| [Migration](https://github.com/avifenesh/glide-mq/blob/main/docs/MIGRATION.md) | Coming from BullMQ? API mapping & workarounds |

## Contributing

Each example should be self-contained with its own `package.json`, `tsconfig.json`, and `README.md` explaining what it demonstrates. All examples must pass `tsc --noEmit` before merging.

## License

Apache-2.0
