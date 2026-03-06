# glide-mq Examples

A collection of examples showing how to use [glide-mq](https://github.com/avifenesh/glide-mq) with various Node.js frameworks and libraries.

## Examples

### Core

| Example | Description | Complexity |
|---------|-------------|------------|
| [core-basics](examples/core-basics) | Queue, Worker, events, progress, retries, bulk ops | Starter |
| [core-workflows](examples/core-workflows) | FlowProducer, chain, group, chord pipelines | Intermediate |
| [core-advanced](examples/core-advanced) | Schedulers, rate limiting, dedup, compression, DLQ | Advanced |

### Framework Integrations (built packages)

| Example | Description | Package |
|---------|-------------|---------|
| [hono-api](examples/hono-api) | REST API + SSE + RPC client with Hono | `@glidemq/hono` |
| [express-dashboard](examples/express-dashboard) | Web UI dashboard for monitoring queues | `@glidemq/dashboard` |

### Framework Usage (direct import - no special package needed)

| Example | Description | Status |
|---------|-------------|--------|
| [express-basic](examples/express-basic) | Express app with background job processing | Planned |
| [hono-basic](examples/hono-basic) | Hono app with queue producer in routes | Planned |
| [koa-basic](examples/koa-basic) | Koa app with queue middleware | Planned |
| [nextjs-api-routes](examples/nextjs-api-routes) | Next.js API routes as job producer + separate worker | Planned |

### Framework Integrations (dedicated packages - to be built)

| Example | Description | Status |
|---------|-------------|--------|
| [nestjs-module](examples/nestjs-module) | NestJS dynamic module with decorators | Planned |
| [fastify-plugin](examples/fastify-plugin) | Fastify plugin with queue decoration | Planned |

### Use Case Examples

| Example | Description | Status |
|---------|-------------|--------|
| [email-service](examples/email-service) | Email queue with retries and DLQ | Planned |
| [image-processing](examples/image-processing) | Image resize pipeline with progress tracking | Planned |
| [webhook-delivery](examples/webhook-delivery) | Reliable webhook delivery with backoff | Planned |
| [cron-scheduler](examples/cron-scheduler) | Scheduled tasks with cron expressions | Planned |
| [request-reply](examples/request-reply) | Synchronous job execution with addAndWait | Planned |
| [opentelemetry](examples/opentelemetry) | Tracing and observability setup | Planned |
| [testing](examples/testing) | In-memory TestQueue/TestWorker usage | Planned |
| [cluster-mode](examples/cluster-mode) | Running with Valkey cluster | Planned |

## Prerequisites

- Node.js 20+
- Valkey 7.0+ or Redis 7.0+ (except testing examples)

## Getting Started

```bash
cd examples/<example-name>
npm install
npm start
```

## Contributing

Each example should be self-contained with its own `package.json` and README explaining what it demonstrates.

## License

Apache-2.0
