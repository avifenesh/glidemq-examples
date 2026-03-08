# Serverless Producer

Demonstrates `Producer` and `ServerlessPool` for lightweight job enqueue in serverless/edge environments.

## What it shows

- **Producer** - lightweight alternative to Queue (no EventEmitter, returns string IDs)
- **add() and addBulk()** - enqueue single and bulk jobs
- **Custom job IDs** - idempotent enqueue, duplicates return null
- **ServerlessPool** - connection caching for warm Lambda/Edge invocations
- **serverlessPool** - module-level singleton for convenient use

## Setup

```bash
npm install
```

Requires Valkey/Redis on `localhost:6379`.

## Run

```bash
npm start
```

## Producer vs Queue

| | Producer | Queue |
|---|---|---|
| Weight | Minimal (no EventEmitter) | Full-featured |
| Returns | String ID or null | Job instance |
| Methods | add(), addBulk(), close() | 25+ methods |
| Workers | No | Yes |
| Events | No | Yes |
| Use case | Serverless, edge, fire-and-forget | Application servers |

## ServerlessPool

```typescript
import { serverlessPool } from 'glide-mq';

// Lambda handler - reuses connection on warm invocations
export async function handler(event) {
  const producer = serverlessPool.getProducer('tasks', {
    connection: { addresses: [{ host: 'cache.example.com', port: 6379 }] },
  });
  await producer.add('process', event.body);
  return { statusCode: 202 };
}
```

## Notes

- Producer shares the same Lua functions as Queue (same FCALL under the hood)
- All job options work: delay, priority, lifo, deduplication, ordering, TTL
- ServerlessPool caches by queue name + connection fingerprint
- Injected clients and custom serializers bypass caching (no fingerprint collisions)
