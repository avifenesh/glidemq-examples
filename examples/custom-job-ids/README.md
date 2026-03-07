# custom-job-ids

Idempotent job enqueuing with custom job IDs in glide-mq.

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
| `queue.add(name, data, { jobId })` | Enqueue with a deterministic ID |
| Duplicate detection | Adding the same `jobId` a second time returns `null` |
| `queue.getJob(id)` | Fetch a job by its known ID |
| `queue.addBulk` with custom IDs | Batch enqueue with per-job IDs |

## Notes

- Custom job IDs enable idempotent enqueuing - safe to retry on network errors.
- A duplicate `add` (same `jobId`, any state) returns `null` without creating a new job.
- Use meaningful IDs derived from your domain (e.g. `order-{orderId}`, `report-{userId}-{month}`).
- Job IDs must not contain control characters, curly braces `{}`, or colons `:`.
