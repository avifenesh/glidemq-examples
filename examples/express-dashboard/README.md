# Express Dashboard

Web UI for monitoring and managing glide-mq queues using `@glidemq/dashboard`.

## Features

- Real-time queue metrics (waiting, active, completed, failed)
- Job inspection with logs and state
- Queue operations: pause, resume, drain, obliterate
- Job operations: retry, remove, promote
- Job search by state, name, data
- SSE event stream
- Read-only mode and authorization hooks

## Run

```bash
npm install
npm start
```

Open http://localhost:3000/dashboard

Requires Valkey/Redis on localhost:6379.
