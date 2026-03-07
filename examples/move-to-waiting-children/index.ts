import { FlowProducer, Worker } from 'glide-mq';
import type { Job } from 'glide-mq';
import { setTimeout } from 'timers/promises';

const connection = { addresses: [{ host: 'localhost', port: 6379 }] };

// moveToWaitingChildren() pauses a parent job until all its children complete.
// The parent throws WaitingChildrenError internally - the worker re-queues it
// automatically once every child is done.

// --- Workers ---

// Child: fetch data from one source
const fetchWorker = new Worker('fetch', async (job: Job) => {
  console.log(`[fetch] ${job.data.source}: fetching...`);
  await setTimeout(100 + Math.floor(Math.random() * 100));
  return { source: job.data.source, rows: Math.floor(Math.random() * 500) + 100 };
}, { connection, concurrency: 5 });

fetchWorker.on('error', (err) => console.error('[fetch] Worker error:', err));

// Child: validate the fetched rows
const validateWorker = new Worker('validate', async (job: Job) => {
  console.log(`[validate] ${job.data.source}: validating ${job.data.rows} rows...`);
  await setTimeout(80);
  return { source: job.data.source, valid: true, rows: job.data.rows };
}, { connection, concurrency: 5 });

validateWorker.on('error', (err) => console.error('[validate] Worker error:', err));

// Parent: aggregate results once ALL children have finished
const aggregateWorker = new Worker('aggregate', async (job: Job) => {
  // On the first invocation, children haven't been added yet.
  // moveToWaitingChildren() suspends the parent until its children complete,
  // then the parent is re-activated and processes children's return values.
  if (!job.data.resumed) {
    console.log(`[aggregate] ${job.id}: suspending - waiting for children`);
    await job.moveToWaitingChildren();
    // ^^ throws WaitingChildrenError - execution stops here on first run
  }

  // On re-activation, children results are available via job.childrenValues
  const childResults = await job.getChildrenValues() as Record<string, { source: string; valid: boolean; rows: number }>;
  const total = Object.values(childResults).reduce((sum, r) => sum + r.rows, 0);
  const allValid = Object.values(childResults).every((r) => r.valid);

  console.log(`[aggregate] ${job.id}: all children done. total rows=${total} allValid=${allValid}`);
  return { total, allValid, sources: Object.values(childResults).map((r) => r.source) };
}, { connection, concurrency: 2 });

aggregateWorker.on('completed', (job, result) => {
  console.log(`\n[aggregate] COMPLETED ${job.id}:`, result);
});
aggregateWorker.on('error', (err) => console.error('[aggregate] Worker error:', err));

// --- Flow Producer ---
// A flow is a parent job with children. Children are added to their own queues;
// the parent automatically waits until all of them complete.

const flow = new FlowProducer({ connection });

// Add a parent 'aggregate' job with three 'fetch' children
const { job: parentJob } = await flow.add({
  name: 'merge-sources',
  queueName: 'aggregate',
  data: { resumed: false },
  children: [
    {
      name: 'fetch-db',
      queueName: 'fetch',
      data: { source: 'database' },
    },
    {
      name: 'fetch-api',
      queueName: 'fetch',
      data: { source: 'external-api' },
    },
    {
      name: 'fetch-cache',
      queueName: 'fetch',
      data: { source: 'redis-cache' },
    },
  ],
});

console.log(`Flow created. Parent job: ${parentJob.id}`);
console.log('Children will be processed first, then parent aggregates results.\n');

// Wait long enough for all jobs to complete
await setTimeout(2000);

// --- Shutdown ---
await Promise.all([
  fetchWorker.close(),
  validateWorker.close(),
  aggregateWorker.close(),
  flow.close(),
]);
console.log('\nDone.');
process.exit(0);
