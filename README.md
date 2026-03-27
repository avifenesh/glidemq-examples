# glide-mq Examples

[![license](https://img.shields.io/badge/license-Apache--2.0-blue)](./LICENSE)

Runnable examples for [glide-mq](https://github.com/avifenesh/glide-mq) covering core patterns, framework integrations, and real-world use cases.

## Where to find examples

**AI-native examples** (usage tracking, streaming, human-in-the-loop, model failover, budget caps, vector search, and more) now live in the main glide-mq repository:

[github.com/avifenesh/glide-mq/tree/main/examples](https://github.com/avifenesh/glide-mq/tree/main/examples)

This repository contains the original core, framework, and feature examples. For new projects, start with the main repo examples - they cover the latest API surface.

## Quick start

```bash
cd examples/core-basics && npm install && npm start
```

Requires **Node.js 20+**, **glide-mq >= 0.13.0**, and **Valkey 7.0+** (except the [testing](examples/testing) example, which runs in-memory).

## What is here

### Core

| Example | Description |
|---------|-------------|
| [core-basics](examples/core-basics) | Queue, Worker, events, progress, retries, bulk ops |
| [core-workflows](examples/core-workflows) | FlowProducer, chain, group, chord pipelines |
| [core-advanced](examples/core-advanced) | Schedulers, rate limiting, dedup, compression, DLQ |

### Framework integrations

| Example | Framework |
|---------|-----------|
| [hono-api](examples/hono-api) | Hono (via @glidemq/hono) |
| [fastify-api](examples/fastify-api) | Fastify (via @glidemq/fastify) |
| [hapi-api](examples/hapi-api) | Hapi (via @glidemq/hapi) |
| [nestjs-module](examples/nestjs-module) | NestJS (via @glidemq/nestjs) |
| [express-dashboard](examples/express-dashboard) | Express (via @glidemq/dashboard) |
| [express-basic](examples/express-basic) | Express (direct) |
| [koa-basic](examples/koa-basic) | Koa (direct) |
| [nextjs-api-routes](examples/nextjs-api-routes) | Next.js (direct) |

### Features and use cases

Batch processing, broadcast, DAG workflows, custom job IDs, pluggable serializers, request-reply, serverless producers, subject filtering, Valkey cluster, and more. See the [examples/](examples/) directory for the full list.

## Links

- [glide-mq](https://github.com/avifenesh/glide-mq) - core library and AI-native examples
- [Full documentation](https://avifenesh.github.io/glide-mq.dev/)
- [@glidemq/hono](https://github.com/avifenesh/glidemq-hono) | [@glidemq/fastify](https://github.com/avifenesh/glidemq-fastify) | [@glidemq/hapi](https://github.com/avifenesh/glidemq-hapi) | [@glidemq/nestjs](https://github.com/avifenesh/glidemq-nestjs) | [@glidemq/dashboard](https://github.com/avifenesh/glidemq-dashboard)

## License

Apache-2.0
