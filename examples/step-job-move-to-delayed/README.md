# step-job-move-to-delayed

Multi-step jobs as resumable state machines using `moveToDelayed`.

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
| `job.moveToDelayed(timestamp, nextStep)` | Suspend job and resume at `nextStep` after delay |
| State machine pattern | Job progresses through named steps, persisting state in `job.data.step` |
| No external scheduler | Steps are scheduled entirely within the job itself |

## Notes

- `moveToDelayed(timestamp, nextStep)` updates `job.data.step` before suspending.
- The job resumes automatically at the scheduled timestamp with the updated step value.
- No external cron or state store needed - all state lives in the job.
- `moveToDelayed` throws `DelayedError` internally - do not catch it.
- Requires `job.data` to be a plain object (not an array or primitive).
