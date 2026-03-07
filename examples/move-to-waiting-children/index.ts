import { FlowProducer, Worker } from 'glide-mq';
import type { Job } from 'glide-mq';
import { setTimeout } from 'timers/promises';

const connection = { addresses: [{ host: 'localhost', port: 6379 }] };

// FlowProducer creates parent-child job hierarchies. The parent automatically
// enters "waiting-children" state and is only activated after ALL children complete.
// Inside the parent processor, call job.getChildrenValues() to access results.
//
// This example shows the static FlowProducer pattern (children declared at creation time).
// For dynamic child addition during processing, call job.moveToWaitingChildren()
// to re-suspend the parent until newly-added children finish.

// --- Workers ---

// Child: fetch data from one source
const fetchWorker = new Worker('fetch', async (job: Job) => {
  console.log(`[fetch] ${job.data.source}: fetching...`);
  await setTimeout(200 + Math.floor(Math.random() * 300));
  const rows = Math.floor(Math.random() * 500) + 100;
  console.log(`[fetch] ${job.data.source}: got ${rows} rows`);
  return { source: job.data.source, rows };
}, { connection, concurrency: 5 });

fetchWorker.on('error', (err) => console.error('[fetch] Worker error:', err));

// Parent: aggregate results once ALL children have finished
const aggregateWorker = new Worker('aggregate', async (job: Job) => {
  // By the time this runs, all children have completed.
  // getChildrenValues() returns a map of { childQueueKey:childId -> returnvalue }
  const childResults = await job.getChildrenValues() as Record<string, { source: string; rows: number }>;

  const entries = Object.values(childResults);
  const total = entries.reduce((sum, r) => sum + r.rows, 0);

  console.log(`[aggregate] ${job.id}: ${entries.length} children done, total rows=${total}`);
  return { total, sources: entries.map((r) => r.source) };
}, { connection, concurrency: 2 });

aggregateWorker.on('completed', (job, result) => {
  console.log(`[aggregate] COMPLETED ${job.id}:`, result);
});
aggregateWorker.on('error', (err) => console.error('[aggregate] Worker error:', err));

// --- Flow Producer ---
const flow = new FlowProducer({ connection });

// --- Example 1: Single parent with 3 fetch children ---
console.log('--- Flow 1: merge 3 data sources ---');
const { job: parentJob1 } = await flow.add({
  name: 'merge-sources',
  queueName: 'aggregate',
  data: { label: 'multi-source merge' },
  children: [
    { name: 'fetch-db', queueName: 'fetch', data: { source: 'database' } },
    { name: 'fetch-api', queueName: 'fetch', data: { source: 'external-api' } },
    { name: 'fetch-cache', queueName: 'fetch', data: { source: 'redis-cache' } },
  ],
});
console.log(`Parent ${parentJob1.id} created with 3 children\n`);

// --- Example 2: Another flow with different children ---
console.log('--- Flow 2: merge 2 data sources ---');
const { job: parentJob2 } = await flow.add({
  name: 'merge-files',
  queueName: 'aggregate',
  data: { label: 'file merge' },
  children: [
    { name: 'fetch-s3', queueName: 'fetch', data: { source: 's3-bucket' } },
    { name: 'fetch-gcs', queueName: 'fetch', data: { source: 'gcs-archive' } },
  ],
});
console.log(`Parent ${parentJob2.id} created with 2 children\n`);

// Wait for all flows to complete
await setTimeout(3000);

// --- Shutdown ---
await Promise.all([
  fetchWorker.close(),
  aggregateWorker.close(),
  flow.close(),
]);
console.log('\nDone.');
