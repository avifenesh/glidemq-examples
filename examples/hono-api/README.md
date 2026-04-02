# Hono API

Full REST API + SSE events for glide-mq queue management using `@glidemq/hono`.

## Features

- Full queue HTTP API for jobs, counts, workers, schedulers, flow create/read/tree/delete, flow usage/budget, usage summary, and broadcast routes
- Server-Sent Events for real-time updates
- Type-safe RPC client (optional)
- Zod validation (optional)
- Custom routes with direct queue access via `c.var.glideMQ`
- In-memory testing mode

## Highlighted routes

- `POST /api/queues/:name/jobs` - add job
- `GET /api/queues/:name/events` - queue lifecycle SSE
- `POST /api/queues/flows` - create a tree flow or DAG over HTTP
- `GET /api/queues/flows/:id/tree` - inspect the nested flow tree
- `DELETE /api/queues/flows/:id` - revoke or flag remaining jobs in a flow
- `GET /api/queues/:name/flows/:id/usage` - flow usage summary
- `GET /api/queues/:name/flows/:id/budget` - flow budget state
- `GET /api/queues/usage/summary` - rolling usage summary across queues
- `POST /api/queues/broadcast/:name` - publish a broadcast message
- `GET /api/queues/broadcast/:name/events?subscription=...` - durable broadcast SSE

## Run

```bash
npm install
npm start
```

Requires Valkey/Redis on localhost:6379.
