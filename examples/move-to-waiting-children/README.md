# move-to-waiting-children

Parent job suspends until all child jobs complete using `moveToWaitingChildren`.

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
| `FlowProducer.add({ children })` | Create a parent job with child jobs across queues |
| `job.moveToWaitingChildren()` | Suspend the parent until all children finish |
| `job.getChildrenValues()` | Access children's return values after they complete |

## Notes

- The parent job is automatically re-activated once every child has completed.
- Children run in their own queues and can span multiple worker processes.
- `getChildrenValues()` returns a map of child job IDs to their return values.
- `moveToWaitingChildren()` throws `WaitingChildrenError` internally - do not catch it.
