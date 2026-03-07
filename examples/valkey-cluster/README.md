# valkey-cluster

Running glide-mq with a Valkey/Redis cluster.

## Setup

```bash
npm install
```

Requires a Valkey/Redis cluster on `localhost:7000-7005`.

To start a local cluster:
```bash
docker run -d --name valkey-cluster -p 7000-7005:7000-7005 \
  valkey/valkey:8.0 --cluster-enabled yes
```

## Run

```bash
npx tsx index.ts
```

## What it shows

| Concept | Description |
|---------|-------------|
| `clusterMode: true` | Enable cluster-aware connections |
| Multiple seed addresses | Connect to any cluster nodes for discovery |
| Hash-tagged keys | All queue keys use `glide:{name}:*` for same-slot routing |
| Scheduler on cluster | `upsertJobScheduler` works identically in cluster mode |

## Notes

- The only code change vs. standalone is `clusterMode: true` in `ConnectionOptions`.
- All glide-mq keys are hash-tagged (`glide:{queueName}:*`), so they always land in the same hash slot.
- Provide 2-3 seed node addresses for redundancy - the client discovers the full topology.
- Queue, Worker, FlowProducer, and schedulers all work identically in cluster mode.
