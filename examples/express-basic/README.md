# Express + glide-mq Example

Queue management API using Express and glide-mq core directly.

## Setup

```bash
npm install
```

## Run

```bash
npx tsx index.ts
```

## Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/queues/:name/jobs` | Add a job |
| GET | `/api/queues/:name/jobs` | List jobs (`?type=waiting`) |
| GET | `/api/queues/:name/jobs/:id` | Get a single job |
| GET | `/api/queues/:name/counts` | Job counts by state |
| POST | `/api/queues/:name/pause` | Pause queue |
| POST | `/api/queues/:name/resume` | Resume queue |
| POST | `/send-email` | Convenience: add an email job |
| POST | `/place-order` | Convenience: add an order job |

## Example

```bash
# Add a job
curl -X POST http://localhost:3000/api/queues/emails/jobs \
  -H "Content-Type: application/json" \
  -d '{"name": "welcome", "data": {"to": "user@example.com"}}'

# Check counts
curl http://localhost:3000/api/queues/emails/counts

# Send email (convenience route)
curl -X POST http://localhost:3000/send-email \
  -H "Content-Type: application/json" \
  -d '{"to": "user@example.com", "subject": "Hello"}'

# Place an order
curl -X POST http://localhost:3000/place-order \
  -H "Content-Type: application/json" \
  -d '{"items": ["widget", "gadget"], "total": 49.99}'
```

## Notes

This example uses glide-mq core directly (no `@glidemq/express` package). For a full REST API with SSE events and Zod validation, see the [Hono](../hono-api/) or [Fastify](../fastify-api/) examples which use dedicated integration packages.
