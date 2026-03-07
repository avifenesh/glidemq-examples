# exclude-data

List jobs without payloads using `excludeData` for lightweight status dashboards.

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
| `queue.getJobs(type, start, end, { excludeData: true })` | List jobs without `data` or `returnvalue` |
| `queue.getJob(id)` | Fetch full job details for a single job |
| `queue.getJob(id, { excludeData: true })` | Fetch a single job without payload |

## Notes

- `excludeData: true` omits `data` and `returnvalue` from the returned job objects.
- Useful for dashboards that only need job status and metadata, not the full payload.
- Significantly reduces memory and network usage when job payloads are large (MB+).
- Fetch full details for individual jobs by ID when needed.
