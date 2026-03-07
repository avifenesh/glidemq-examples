# cron-scheduler

Recurring jobs with cron patterns and fixed intervals in glide-mq.

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
| `every: ms` | Fixed-interval scheduler (drift-free, server-side) |
| `pattern: '* * * * *'` | Standard 5-field cron expression |
| `tz: 'America/New_York'` | Cron with IANA timezone |
| `startDate` | Delay the first scheduler run |
| `getJobScheduler(name)` | Inspect scheduler state |
| `removeJobScheduler(name)` | Stop and remove a scheduler |

## Notes

- Cron patterns use 5 fields: `minute hour dayOfMonth month dayOfWeek`.
- Timezone defaults to UTC when `tz` is not specified.
- `every` and `pattern` are mutually exclusive.
- Schedulers persist in Valkey and survive worker restarts.
- Set `promotionInterval` on the Worker to control how quickly scheduled jobs are promoted.
