# Hapi.js API

Full REST API + SSE events for glide-mq queue management using `@glidemq/hapi`.

## Features

- 21 REST endpoints for queue/job management
- Server-Sent Events for real-time updates
- Zod validation (optional)
- Custom routes with direct queue access via `request.server.glidemq`
- In-memory testing mode
- Automatic graceful shutdown via Hapi's `onPostStop` hook

## Endpoints

- `POST /api/queues/{name}/jobs` - add job
- `POST /api/queues/{name}/jobs/wait` - add and wait for result
- `GET /api/queues/{name}/jobs` - list jobs by state
- `GET /api/queues/{name}/jobs/{id}` - job details
- `POST /api/queues/{name}/jobs/{id}/priority` - change priority
- `POST /api/queues/{name}/jobs/{id}/delay` - change delay
- `POST /api/queues/{name}/jobs/{id}/promote` - promote delayed job
- `GET /api/queues/{name}/counts` - job counts by state
- `GET /api/queues/{name}/metrics` - queue metrics
- `POST /api/queues/{name}/pause` - pause queue
- `POST /api/queues/{name}/resume` - resume queue
- `POST /api/queues/{name}/drain` - drain queue
- `POST /api/queues/{name}/retry` - retry failed jobs
- `DELETE /api/queues/{name}/clean` - clean old jobs
- `GET /api/queues/{name}/workers` - list workers
- `GET /api/queues/{name}/events` - SSE stream
- `POST /api/queues/{name}/produce` - serverless produce
- `GET /api/queues/{name}/schedulers` - list schedulers
- `GET /api/queues/{name}/schedulers/{schedulerName}` - get scheduler
- `PUT /api/queues/{name}/schedulers/{schedulerName}` - upsert scheduler
- `DELETE /api/queues/{name}/schedulers/{schedulerName}` - remove scheduler

## Run

```bash
npm install
npm start
```

Requires Valkey/Redis on localhost:6379.

## See also

- [hapi-basic](../hapi-basic) - uses glide-mq directly without the plugin
