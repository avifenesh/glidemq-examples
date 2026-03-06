# Hono API

Full REST API + SSE events for glide-mq queue management using `@glidemq/hono`.

## Features

- 11 REST endpoints for queue/job management
- Server-Sent Events for real-time updates
- Type-safe RPC client (optional)
- Zod validation (optional)
- Custom routes with direct queue access via `c.var.glideMQ`
- In-memory testing mode

## Endpoints

- `GET /api/queues` - list all queues with job counts
- `GET /api/queues/:name/jobs` - list jobs by state
- `GET /api/queues/:name/jobs/:id` - job details
- `POST /api/queues/:name/jobs` - add job
- `POST /api/queues/:name/pause` - pause queue
- `POST /api/queues/:name/resume` - resume queue
- `DELETE /api/queues/:name/jobs/:id` - remove job
- `POST /api/queues/:name/jobs/:id/retry` - retry job
- `POST /api/queues/:name/drain` - drain queue
- `POST /api/queues/:name/obliterate` - obliterate queue
- `GET /api/queues/events` - SSE stream

## Run

```bash
npm install
npm start
```

Requires Valkey/Redis on localhost:6379.
