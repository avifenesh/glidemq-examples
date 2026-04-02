# http-proxy

Cross-language queue access via the glide-mq HTTP proxy.

## Setup

```bash
npm install
```

Requires a running Valkey/Redis instance on `localhost:6379`.

## Run

```bash
npx tsx index.ts
```

## What it shows

| Concept | Description |
|---------|-------------|
| `createProxyServer(opts)` | Start an Express server that maps HTTP to queue ops |
| `POST /queues/:name/jobs` | Enqueue a single job |
| `POST /queues/:name/jobs/bulk` | Enqueue jobs in bulk |
| `GET /queues/:name/jobs/:id` | Get job by ID |
| `GET /queues/:name/counts` | Get job counts |
| `GET /queues/:name/events` | Subscribe to queue lifecycle events over SSE |
| `GET /usage/summary` | Read rolling usage totals across one or more queues |
| `POST /broadcast/:name` | Publish a broadcast message |
| `GET /broadcast/:name/events` | Read a durable broadcast subscription over SSE |
| `GET /health` | Health check |
| `queues` allowlist | Restrict which queues are accessible |

## Notes

- The proxy is an Express app - any HTTP client (Python, Go, Ruby, curl) can enqueue jobs, read queue events, publish broadcasts, and query usage summaries.
- Workers are separate Node.js processes that consume from the same queues.
- Pass `queues: ['allowed', 'names']` to restrict access. The same allowlist applies to queue names in `/usage/summary?queues=...` and to `/broadcast/:name`.
- Install `express` as a peer dependency alongside `glide-mq`.
- The proxy supports all job options: `delay`, `priority`, `attempts`, `jobId`, etc.
- Broadcast SSE requires a durable `subscription` query param and supports optional `subjects=orders.*,...` filtering.

## Example: enqueue from curl

```bash
curl -X POST http://localhost:3456/queues/emails/jobs \
  -H 'Content-Type: application/json' \
  -d '{"name": "welcome", "data": {"to": "alice@example.com"}}'
```

## Example: publish a broadcast message

```bash
curl -X POST http://localhost:3456/broadcast/notifications \
  -H 'Content-Type: application/json' \
  -d '{"subject":"orders.created","data":{"orderId":"ORD-900"}}'
```
