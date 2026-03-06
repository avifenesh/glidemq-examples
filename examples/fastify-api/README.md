# Fastify API

Full REST API + SSE events for glide-mq queue management using `@glidemq/fastify`.

## Features

- 11 REST endpoints for queue/job management
- Server-Sent Events for real-time updates
- Zod validation (optional)
- Custom routes with direct queue access via `app.glidemq`
- In-memory testing mode
- Automatic graceful shutdown via Fastify's `onClose` hook

## Endpoints

- `GET /api/queues/:name/jobs` - list jobs by state
- `GET /api/queues/:name/jobs/:id` - job details
- `POST /api/queues/:name/jobs` - add job
- `GET /api/queues/:name/counts` - job counts by state
- `POST /api/queues/:name/pause` - pause queue
- `POST /api/queues/:name/resume` - resume queue
- `POST /api/queues/:name/drain` - drain queue
- `POST /api/queues/:name/retry` - retry failed jobs
- `DELETE /api/queues/:name/clean` - clean old jobs
- `GET /api/queues/:name/workers` - list workers
- `GET /api/queues/:name/events` - SSE stream

## Run

```bash
npm install
npm start
```

Requires Valkey/Redis on localhost:6379.
