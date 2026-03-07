import { Queue, Worker } from 'glide-mq';
import type { Job } from 'glide-mq';
import { setTimeout } from 'timers/promises';

const connection = { addresses: [{ host: 'localhost', port: 6379 }] };

// LIFO (Last-In-First-Out) processes the NEWEST jobs first.
// Use cases: cache invalidation (latest wins), real-time dashboards,
// undo stacks, any scenario where recent data is more valuable.
//
// Priority ordering is preserved: priority > LIFO > FIFO.
// LIFO cannot be combined with ordering keys.

// --- 1. Basic LIFO queue ---

const queue = new Queue('lifo-demo', { connection });

// Add 10 jobs - with LIFO, job 10 will be processed first
console.log('Adding 10 LIFO jobs (newest processed first)...\n');
for (let i = 1; i <= 10; i++) {
  await queue.add(`task-${i}`, { index: i, createdAt: Date.now() }, { lifo: true });
}

const processOrder: number[] = [];

const worker = new Worker('lifo-demo', async (job: Job) => {
  processOrder.push(job.data.index);
  console.log(`[worker] Processing task-${job.data.index} (LIFO order)`);
  await setTimeout(30);
  return { index: job.data.index };
}, { connection, concurrency: 1 }); // concurrency 1 to show ordering clearly

worker.on('error', () => {});

await setTimeout(2000);
console.log(`\nProcessing order: [${processOrder.join(', ')}]`);
console.log('Expected: newest first (10, 9, 8, ... 1)\n');

await worker.close();

// --- 2. Priority takes precedence over LIFO ---

console.log('--- Priority > LIFO ---\n');

// Add LIFO jobs with mixed priorities
await queue.add('normal-1', { label: 'normal-1' }, { lifo: true });
await queue.add('normal-2', { label: 'normal-2' }, { lifo: true });
await queue.add('urgent',   { label: 'urgent' },   { lifo: true, priority: 1 });
await queue.add('normal-3', { label: 'normal-3' }, { lifo: true });

const priorityOrder: string[] = [];

const priorityWorker = new Worker('lifo-demo', async (job: Job) => {
  priorityOrder.push(job.data.label);
  console.log(`[worker] ${job.data.label} (priority: ${job.opts.priority ?? 'none'})`);
  await setTimeout(30);
  return { label: job.data.label };
}, { connection, concurrency: 1 });

priorityWorker.on('error', () => {});

await setTimeout(1500);
console.log(`\nPriority order: [${priorityOrder.join(', ')}]`);
console.log('Expected: urgent first (priority=1), then LIFO for the rest\n');

await priorityWorker.close();

// --- 3. LIFO vs FIFO comparison ---

console.log('--- LIFO vs FIFO side by side ---\n');

const fifoQueue = new Queue('fifo-compare', { connection });
const lifoQueue = new Queue('lifo-compare', { connection });

const fifoOrder: number[] = [];
const lifoOrder: number[] = [];

// Add same jobs to both queues
for (let i = 1; i <= 5; i++) {
  await fifoQueue.add(`item-${i}`, { index: i }); // default FIFO
  await lifoQueue.add(`item-${i}`, { index: i }, { lifo: true }); // LIFO
}

const fifoWorker = new Worker('fifo-compare', async (job: Job) => {
  fifoOrder.push(job.data.index);
  return { index: job.data.index };
}, { connection, concurrency: 1 });

const lifoWorker = new Worker('lifo-compare', async (job: Job) => {
  lifoOrder.push(job.data.index);
  return { index: job.data.index };
}, { connection, concurrency: 1 });

fifoWorker.on('error', () => {});
lifoWorker.on('error', () => {});

await setTimeout(1500);

console.log(`FIFO order: [${fifoOrder.join(', ')}]  (oldest first)`);
console.log(`LIFO order: [${lifoOrder.join(', ')}]  (newest first)`);

// --- Shutdown ---
await Promise.all([
  fifoWorker.close(),
  lifoWorker.close(),
  queue.close(),
  fifoQueue.close(),
  lifoQueue.close(),
]);
console.log('\nDone.');
