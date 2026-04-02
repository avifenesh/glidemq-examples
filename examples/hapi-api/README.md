# Hapi.js API

Full REST API + SSE events for glide-mq queue management using `@glidemq/hapi`.

## Features

- Full queue HTTP API for jobs, counts, workers, schedulers, flow usage/budget, usage summary, and broadcast routes
- Server-Sent Events for real-time updates
- Joi validation
- Custom routes with direct queue access via `request.server.glidemq`
- In-memory testing mode
- Automatic graceful shutdown via Hapi's `onPostStop` hook

## Highlighted routes

- `POST /api/queues/{name}/jobs` - add job
- `GET /api/queues/{name}/events` - queue lifecycle SSE
- `GET /api/queues/{name}/flows/{id}/usage` - flow usage summary
- `GET /api/queues/{name}/flows/{id}/budget` - flow budget state
- `GET /api/queues/usage/summary` - rolling usage summary across queues
- `POST /api/queues/broadcast/{name}` - publish a broadcast message
- `GET /api/queues/broadcast/{name}/events?subscription=...` - durable broadcast SSE

## Run

```bash
npm install
npm start
```

Requires Valkey/Redis on localhost:6379.

## See also

- [hapi-basic](../hapi-basic) - uses glide-mq directly without the plugin
