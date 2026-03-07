# valkey-cluster

Running glide-mq with a Valkey/Redis cluster.

## Setup

```bash
npm install
```

Requires a Valkey/Redis cluster on `localhost:7000-7005`.

To start a local 6-node cluster (3 masters + 3 replicas), use the Valkey
`create-cluster` script or a multi-container setup. See the
[Valkey cluster tutorial](https://valkey.io/topics/cluster-tutorial/) for details.

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
