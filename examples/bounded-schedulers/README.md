# bounded-schedulers

Schedulers with execution limits and end dates in glide-mq.

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
| `limit` | Stop scheduler after N executions |
| `endDate` | Stop scheduler after a given timestamp |
| Combined `limit` + `endDate` | Stop on whichever condition is met first |

## Notes

- `limit: N` stops the scheduler automatically after N successful job executions.
- `endDate: timestamp` stops at the given Unix ms timestamp regardless of run count.
- When both are set, the scheduler stops at whichever condition triggers first.
- Bounded schedulers are useful for trials, campaigns, and time-limited automations.
