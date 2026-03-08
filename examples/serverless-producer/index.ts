import { Producer, ServerlessPool, serverlessPool, Worker } from 'glide-mq';
import type { Job, ProducerOptions } from 'glide-mq';
import { setTimeout } from 'timers/promises';

const connection = { addresses: [{ host: 'localhost', port: 6379 }] };

// Producer is a lightweight alternative to Queue for serverless/edge environments.
// No EventEmitter, no Job instances, no state tracking - just add() and addBulk().
// Returns plain string IDs instead of full Job objects.
//
// ServerlessPool caches Producer instances by connection fingerprint so warm
// Lambda/Edge invocations reuse connections instead of creating new ones.

// --- 1. Direct Producer usage ---

const producer = new Producer('tasks', { connection });

console.log('--- Direct Producer ---\n');

const id1 = await producer.add('process-image', { url: 'https://example.com/photo.jpg', width: 800 });
console.log(`Added job: ${id1}`);

const id2 = await producer.add('send-email', { to: 'user@example.com', subject: 'Welcome' });
console.log(`Added job: ${id2}`);

// Custom job ID for idempotency
const id3 = await producer.add('charge', { amount: 99.99 }, { jobId: 'order-123' });
console.log(`Added job: ${id3} (custom ID)`);

// Duplicate returns null
const dup = await producer.add('charge', { amount: 99.99 }, { jobId: 'order-123' });
console.log(`Duplicate: ${dup} (null = skipped)\n`);

// --- 2. Bulk enqueue ---

console.log('--- Bulk enqueue ---\n');

const ids = await producer.addBulk([
  { name: 'resize', data: { file: 'a.png' } },
  { name: 'resize', data: { file: 'b.png' } },
  { name: 'resize', data: { file: 'c.png' } },
  { name: 'resize', data: { file: 'd.png' } },
  { name: 'resize', data: { file: 'e.png' } },
]);
console.log(`Bulk added ${ids.length} jobs: [${ids.join(', ')}]\n`);

// --- 3. ServerlessPool (connection reuse for Lambda/Edge) ---

console.log('--- ServerlessPool ---\n');

const opts: ProducerOptions = { connection };

// Simulating multiple Lambda invocations - same pool, same cached connection
const p1 = serverlessPool.getProducer('notifications', opts);
const p2 = serverlessPool.getProducer('notifications', opts);
console.log(`Same instance: ${p1 === p2}`); // true - cached by fingerprint

const p3 = serverlessPool.getProducer('analytics', opts);
console.log(`Different queue: ${p1 === p3}`); // false - different queue name

await p1.add('push', { token: 'device-abc', message: 'New order!' });
await p3.add('track', { event: 'page_view', page: '/checkout' });
console.log('Enqueued via pooled producers\n');

// --- 4. Worker consumes the jobs ---

console.log('--- Worker processing ---\n');

const worker = new Worker('tasks', async (job: Job) => {
  console.log(`[worker] ${job.name}: ${JSON.stringify(job.data)}`);
  return { done: true };
}, { connection, concurrency: 5 });

worker.on('error', () => {});

await setTimeout(1500);

const notifWorker = new Worker('notifications', async (job: Job) => {
  console.log(`[notifications] ${job.name}: ${JSON.stringify(job.data)}`);
  return { sent: true };
}, { connection, concurrency: 2 });

notifWorker.on('error', () => {});

await setTimeout(1000);

// --- Shutdown ---
await Promise.all([
  producer.close(),
  serverlessPool.closeAll(),
  worker.close(),
  notifWorker.close(),
]);
console.log('\nDone.');
