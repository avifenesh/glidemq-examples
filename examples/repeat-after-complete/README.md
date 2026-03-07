# repeat-after-complete

Schedule jobs to repeat only after the previous run finishes, using `repeatAfterComplete`.

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
| `repeatAfterComplete: ms` | Schedule next run N ms after current run completes |
| No overlap guarantee | Next job is only queued after the current one finishes |
| Multiple schedulers | Independent queues each with their own cool-down |

## Notes

- Unlike `every` (fixed interval), `repeatAfterComplete` measures from the end of each run.
- If a job takes 400ms and `repeatAfterComplete` is 100ms, the effective interval is 500ms.
- This prevents job pile-up when processing takes longer than the schedule interval.
- Useful for scrapers, report generators, and any task that must not overlap.
