import { Queue, Worker } from 'glide-mq';
import type { Job, ConnectionOptions } from 'glide-mq';
import { setTimeout } from 'timers/promises';

// --- Valkey/Redis Cluster Connection ---
// glide-mq uses hash-tagged keys (glide:{queueName}:*) so all keys for a
// queue land in the same hash slot - no cross-slot issues.
//
// To run this example, start a Valkey cluster. For local dev:
//   docker run -d --name valkey-cluster -p 7000-7005:7000-7005 \
//     valkey/valkey:8.0 --cluster-enabled yes
//
// Or use the official create-cluster script:
//   valkey-cli --cluster create 127.0.0.1:7000 127.0.0.1:7001 \
//     127.0.0.1:7002 127.0.0.1:7003 127.0.0.1:7004 127.0.0.1:7005 \
//     --cluster-replicas 1

const clusterConnection: ConnectionOptions = {
  addresses: [
    { host: 'localhost', port: 7000 },
    { host: 'localhost', port: 7001 },
    { host: 'localhost', port: 7002 },
  ],
  clusterMode: true,
};

// --- Queue + Worker (same API as standalone) ---
// The only difference is `clusterMode: true` in the connection options.
// All queue operations, Lua functions, and streams work identically.

const queue = new Queue('cluster-demo', { connection: clusterConnection });

const worker = new Worker('cluster-demo', async (job: Job) => {
  console.log(`[worker] Processing ${job.name} on cluster: ${JSON.stringify(job.data)}`);
  await setTimeout(50);
  return { processed: true, node: 'some-cluster-node' };
}, { connection: clusterConnection, concurrency: 3 });

worker.on('completed', (job, result) => {
  console.log(`[worker] Completed ${job.id}:`, result);
});
worker.on('error', (err) => console.error('[worker] Error:', err));

// --- Produce jobs ---

console.log('Adding 5 jobs to cluster queue...\n');
for (let i = 0; i < 5; i++) {
  await queue.add('compute', { index: i, payload: `data-${i}` });
}

// Wait for processing
await setTimeout(1000);

const counts = await queue.getJobCounts();
console.log('\nJob counts:', counts);

// --- Scheduler on cluster ---
// Schedulers also work on cluster mode - keys are hash-tagged.

await queue.upsertJobScheduler(
  'cluster-heartbeat',
  { every: 500 },
  { name: 'heartbeat', data: { source: 'cluster' } },
);
console.log('Scheduler added on cluster.');

await setTimeout(2000);

const schedulerCounts = await queue.getJobCounts();
console.log('After scheduler:', schedulerCounts);

await queue.removeJobScheduler('cluster-heartbeat');

// --- Shutdown ---
await worker.close();
await queue.close();
console.log('\nDone.');
