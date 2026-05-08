# glide-mq Examples

[![license](https://img.shields.io/badge/license-Apache--2.0-blue)](./LICENSE)

Runnable examples for [glide-mq](https://github.com/avifenesh/glide-mq) - high-performance message queue with AI-native orchestration primitives.

## Quick start

```bash
cd examples/core-basics && npm install && npm start
```

Requires **Node.js 20+**, **glide-mq >= 0.15.2**, and **Valkey 7.0+** (TestQueue examples run in-memory without Valkey).

## Examples

| AI Orchestration | Core Patterns | Framework Plugins |
|------------------|---------------|-------------------|
| [Usage & Costs](examples/ai-usage-and-costs) | [Basics](examples/core-basics) | [Hono](examples/hono-api) |
| [Budget & TPM](examples/ai-budget) | [Workflows](examples/core-workflows) | [Fastify](examples/fastify-api) |
| [Streaming](examples/ai-streaming) | [Advanced](examples/core-advanced) | [Hapi](examples/hapi-api) |
| [Agent Loops](examples/ai-agents) | [DAG Flows](examples/dag-workflows) | [NestJS](examples/nestjs-module) |
| [Search & Vectors](examples/ai-search) | [Scheduling](examples/cron-scheduler) | [Express](examples/express-dashboard) |
| [SDK Integrations](examples/ai-integrations) | [Batch Processing](examples/batch-processing) | [Koa](examples/koa-basic) |
| [Testing](examples/testing) | [Broadcast](examples/broadcast) | [Next.js](examples/nextjs-api-routes) |

### More core examples

Ordering keys, rate limiting, dedup, stall detection, custom job IDs, pluggable serializers, request-reply, serverless producers, Valkey cluster, and more. See [examples/](examples/) for the full list.

Need cross-language access from Python, Go, Ruby, or shell scripts? Start with [HTTP Proxy](examples/http-proxy) for queue routes, flow create/read/tree/delete, queue events SSE, rolling usage summaries, and broadcast publish/SSE over HTTP.

## Links

- [glide-mq](https://github.com/avifenesh/glide-mq) - core library
- [Documentation](https://glidemq.dev/)
- [@glidemq/hono](https://github.com/avifenesh/glidemq-hono) | [@glidemq/fastify](https://github.com/avifenesh/glidemq-fastify) | [@glidemq/hapi](https://github.com/avifenesh/glidemq-hapi) | [@glidemq/nestjs](https://github.com/avifenesh/glidemq-nestjs) | [@glidemq/dashboard](https://github.com/avifenesh/glidemq-dashboard)

## License

Apache-2.0
