# LIFO Job Processing Mode

Demonstrates `lifo: true` option for last-in-first-out job processing, showing priority > LIFO > FIFO ordering.

## What it shows

- **LIFO ordering** - newest jobs processed first
- **Priority precedence** - priority jobs always run before LIFO jobs
- **LIFO vs FIFO comparison** - side-by-side ordering difference
- **Use cases** - cache invalidation, real-time dashboards, undo stacks

## Setup

```bash
npm install
```

Requires Valkey/Redis on `localhost:6379`.

## Run

```bash
npm start
```

## Ordering rules

```
Priority jobs (lowest number first)
  > LIFO jobs (newest first)
    > FIFO jobs (oldest first, default)
```

## Key concepts

- `lifo: true` on `JobOptions` routes the job to a dedicated LIFO list (RPUSH/RPOP)
- Default (no `lifo`) uses the stream (FIFO via XREADGROUP)
- Priority jobs always take precedence regardless of LIFO/FIFO
- LIFO cannot be combined with ordering keys (`ordering.key`)
- Delayed jobs are promoted normally - LIFO applies at the ready-to-process stage

## Notes

- Use `concurrency: 1` to observe strict ordering; higher concurrency processes in parallel
- LIFO is per-queue, not per-job-name - all LIFO jobs in the same queue share one stack
