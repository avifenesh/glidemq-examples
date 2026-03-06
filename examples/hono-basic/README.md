# Hono Basic

Simple Hono app using glide-mq directly (no `@glidemq/hono` package needed).

Shows the minimal integration pattern: import `glide-mq`, create a queue and worker, produce jobs from routes.

## Run

```bash
npm install
npm start
```

```bash
# Queue an email
curl -X POST http://localhost:3000/send-email \
  -H 'Content-Type: application/json' \
  -d '{"to":"user@example.com","subject":"Hello","body":"World"}'

# Check queue status
curl http://localhost:3000/queue-status
```

Requires Valkey/Redis on localhost:6379.
