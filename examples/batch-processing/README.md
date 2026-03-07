# Batch Processing with glide-mq

Process multiple jobs at once with a single processor invocation - ideal for bulk DB inserts, batch API calls, and high-throughput event ingestion.

## How It Works

Pass a `batch` option to `Worker`. The processor receives a `Job[]` array instead of a single `Job`, and must return a result array of the same length.

```typescript
const worker = new Worker('queue', async (jobs: Job[]) => {
  // One DB round trip for the whole batch
  await db.insertMany(jobs.map(j => j.data));
  return jobs.map(j => ({ stored: true }));
}, {
  connection,
  batch: {
    size: 50,      // collect up to 50 jobs
    timeout: 200,  // or flush after 200ms if fewer available
  },
});
```

## Options

| Option | Type | Description |
|--------|------|-------------|
| `batch.size` | `number` (1-1000) | Max jobs collected before invoking processor |
| `batch.timeout` | `number` (ms) | Max wait time for a full batch. `0` = process immediately when any jobs available |

## Tradeoff: Latency vs Throughput

| Mode | Latency | Throughput | Best for |
|------|---------|------------|----------|
| Single job (default) | Low | Moderate | Interactive tasks |
| Batch | Higher | High | Bulk inserts, analytics, notifications |

## Run

```bash
npm install
npx tsx index.ts
```

Requires Valkey/Redis on `localhost:6379`.
