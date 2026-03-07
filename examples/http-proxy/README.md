# http-proxy

Cross-language job enqueuing via the glide-mq HTTP proxy.

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
| `GET /health` | Health check |
| `queues` allowlist | Restrict which queues are accessible |

## Notes

- The proxy is an Express app - any HTTP client (Python, Go, Ruby, curl) can enqueue jobs.
- Workers are separate Node.js processes that consume from the same queues.
- Pass `queues: ['allowed', 'names']` to restrict access (requests to other queues get 403).
- Install `express` as a peer dependency alongside `glide-mq`.
- The proxy supports all job options: `delay`, `priority`, `attempts`, `jobId`, etc.

## Example: enqueue from curl

```bash
curl -X POST http://localhost:3456/queues/emails/jobs \
  -H 'Content-Type: application/json' \
  -d '{"name": "welcome", "data": {"to": "alice@example.com"}}'
```
