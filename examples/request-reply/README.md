# request-reply

Synchronous request-reply (RPC) over glide-mq using `addAndWait`.

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
| `queue.addAndWait(name, data, { waitTimeout })` | Enqueues a job and blocks until its result is available |
| Concurrent RPC calls | `Promise.all` over multiple `addAndWait` calls |
| Worker returning values | Return value from the processor becomes the RPC result |

## Notes

- `addAndWait` is synchronous from the caller's perspective - no polling required.
- The worker processes the job normally; the caller receives the return value directly.
- Set `waitTimeout` (ms) to cap how long the caller waits.
- Multiple concurrent `addAndWait` calls are safe and efficient.
