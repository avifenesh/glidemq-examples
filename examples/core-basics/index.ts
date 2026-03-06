import { Queue, Worker, QueueEvents } from 'glide-mq';
import type { Job } from 'glide-mq';

const connection = {
  addresses: [{ host: 'localhost', port: 6379 }],
  clusterMode: false,
};

// --- 1. Basic Queue & Worker ---

const queue = new Queue('tasks', { connection });

const worker = new Worker('tasks', async (job: Job) => {
  console.log(`Processing ${job.name}:`, job.data);

  // Progress tracking
  await job.updateProgress(50);
  await job.log('Halfway done');
  await job.updateProgress(100);

  return { processed: true, id: job.data.id };
}, { connection, concurrency: 5 });

worker.on('completed', (job) => console.log(`Job ${job.id} completed`));
worker.on('failed', (job, err) => console.error(`Job ${job.id} failed:`, err.message));

// --- 2. Real-time Events ---

const events = new QueueEvents('tasks', { connection });
events.on('added', ({ jobId }) => console.log(`Event: job ${jobId} added`));
events.on('completed', ({ jobId }) => console.log(`Event: job ${jobId} completed`));

// --- 3. Produce Jobs ---

// Single job
await queue.add('send-email', { to: 'user@example.com', subject: 'Hello' });

// Delayed job
await queue.add('reminder', { message: 'Follow up' }, { delay: 5000 });

// Priority job
await queue.add('urgent', { alert: 'Server down' }, { priority: 1 });

// Job with retries
await queue.add('payment', { amount: 99.99 }, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
});

// Bulk insert
const bulkJobs = Array.from({ length: 20 }, (_, i) => ({
  name: 'batch-item',
  data: { index: i },
}));
await queue.addBulk(bulkJobs);
console.log('Added 20 jobs via addBulk');

// --- 4. Graceful Shutdown ---

console.log('Running... Press Ctrl+C to stop.');

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await worker.close();
  await events.close();
  await queue.close();
  process.exit(0);
});
