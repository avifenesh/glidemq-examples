# Hapi.js Basic

Basic Hapi.js server using glide-mq directly (no `@glidemq/hapi` plugin).

## Features

- Queue + Worker registered manually
- REST endpoints: add job, list jobs, get job, counts, pause, resume
- Convenience routes: `/send-email`, `/place-order`
- Graceful shutdown via `server.stop()` + manual close

## Endpoints

- `POST /api/queues/{name}/jobs` - add a job
- `GET /api/queues/{name}/jobs` - list jobs by state
- `GET /api/queues/{name}/jobs/{id}` - get job by ID
- `GET /api/queues/{name}/counts` - job counts
- `POST /api/queues/{name}/pause` - pause queue
- `POST /api/queues/{name}/resume` - resume queue

## Run

```bash
npm install
npm start
```

Requires Valkey/Redis on localhost:6379.

## See also

- [hapi-api](../hapi-api) - uses `@glidemq/hapi` plugin for 21 endpoints with zero boilerplate
