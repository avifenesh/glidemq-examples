import { Queue, Worker } from 'glide-mq';
import type { Job } from 'glide-mq';
import { setTimeout } from 'timers/promises';

const connection = { addresses: [{ host: 'localhost', port: 6379 }] };

const queue = new Queue('tasks', { connection });
const worker = new Worker('tasks', async (job: Job) => {
  console.log(`Processing job ${job.id}: ${job.name}`);
  return { done: true };
}, { connection, concurrency: 3 });

worker.on('error', (err) => console.error('Worker error:', err));

// --- 1. Custom job ID for idempotent enqueuing ---
// Adding the same jobId a second time returns null (deduplicated).

const job1 = await queue.add('send-report', { userId: 'u-123', month: '2026-02' }, {
  jobId: 'report-u-123-2026-02',
});
console.log('Added job:', job1?.id); // report-u-123-2026-02

const job2 = await queue.add('send-report', { userId: 'u-123', month: '2026-02' }, {
  jobId: 'report-u-123-2026-02', // same ID - deduplicated
});
console.log('Duplicate add result:', job2); // null

// --- 2. Lookup by known ID ---
// Poll until the job is processed rather than using a fixed delay.

let fetched = await queue.getJob('report-u-123-2026-02');
while (!fetched?.returnvalue) {
  await setTimeout(50);
  fetched = await queue.getJob('report-u-123-2026-02');
}
console.log('\nFetched by ID:', { id: fetched?.id, name: fetched?.name, returnvalue: fetched?.returnvalue });

// --- 3. Batch with custom IDs (e.g. order IDs from your DB) ---

const orders = ['ORD-001', 'ORD-002', 'ORD-003'];
const jobs = await queue.addBulk(
  orders.map((orderId) => ({
    name: 'process-order',
    data: { orderId },
    opts: { jobId: `order-${orderId}` },
  })),
);
console.log('\nBulk add with custom IDs:', jobs.map((j) => j?.id));

// Adding same orders again - all return null (idempotent)
const deduped = await queue.addBulk(
  orders.map((orderId) => ({
    name: 'process-order',
    data: { orderId },
    opts: { jobId: `order-${orderId}` },
  })),
);
console.log('Re-add duplicates:', deduped); // [null, null, null]

// Wait for order jobs to be processed before shutting down.
let counts = await queue.getJobCounts();
while ((counts.active ?? 0) > 0 || (counts.waiting ?? 0) > 0) {
  await setTimeout(50);
  counts = await queue.getJobCounts();
}

// --- Shutdown ---
await worker.close();
await queue.close();
console.log('\nDone.');
