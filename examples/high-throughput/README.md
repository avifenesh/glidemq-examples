# High-Throughput Worker Tuning

Skip server-side event publishing and metrics recording to reduce redis calls in the worker hot path.

## Options (v0.10+)

| Option | Default | Effect when `false` |
|--------|---------|---------------------|
| `events` | `true` | Skips the XADD call to the Valkey event stream per job completion (~1 fewer redis call). |
| `metrics` | `true` | Skips the HINCRBY call to the metrics hash per job completion (~1-2 fewer redis calls). |

## When to use

- You are **not** consuming server-side events via `QueueEvents`.
- You are **not** calling `queue.getMetrics()` for dashboards or monitoring.
- You want maximum throughput with minimal per-job overhead.

The TypeScript-side `EventEmitter` (`worker.on('completed', ...)`) still works normally - it is driven by the local process, not the Valkey event stream.

## Run

```bash
npm install
npx tsx index.ts
```

Requires Valkey/Redis on `localhost:6379`.

## Expected output

```
Adding 1000 jobs (run 1 - events/metrics OFF)...
[Run 1] events:false, metrics:false  => 1000 jobs in 1823 ms (548 jobs/s)

Adding 1000 jobs (run 2 - events/metrics ON)...
[Run 2] events:true,  metrics:true   => 1000 jobs in 2104 ms (475 jobs/s)

Result: disabling events+metrics was faster by 13.4%
Tip: the savings grow with concurrency and smaller job payloads, where the per-job redis overhead is a larger fraction of total time.

Done.
```

Actual numbers vary by hardware and Valkey deployment. The relative difference is what matters.
