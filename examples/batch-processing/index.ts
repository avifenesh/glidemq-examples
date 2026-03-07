import { Queue, Worker } from 'glide-mq';
import type { Job, BatchProcessor } from 'glide-mq';
import { setTimeout } from 'timers/promises';

const connection = { addresses: [{ host: 'localhost', port: 6379 }] };

// --- 1. Basic batch worker ---
// BatchProcessor receives a Job[] and must return a result array of the same length.

const analyticsQueue = new Queue('analytics', { connection });

const analyticsBatch: BatchProcessor = async (jobs: Job[]) => {
  console.log(`[analytics] Processing batch of ${jobs.length} events`);

  // Simulate a bulk DB insert - one round trip for the whole batch
  const rows = jobs.map((j) => ({ event: j.data.event, userId: j.data.userId }));
  await setTimeout(20); // simulated DB write
  console.log(`[analytics] Inserted ${rows.length} rows`);

  // Return one result per job (same order as input)
  return jobs.map((j) => ({ stored: true, event: j.data.event }));
};

const analyticsWorker = new Worker('analytics', analyticsBatch, {
  connection,
  concurrency: 1,
  batch: {
    size: 10,      // collect up to 10 jobs before processing
    timeout: 100,  // or flush after 100 ms if fewer than 10 are available
  },
});

analyticsWorker.on('completed', (job) => console.log(`[analytics] Job ${job.id} completed`));
analyticsWorker.on('error', (err) => console.error('[analytics] Worker error:', err));

// --- 2. Batch worker for push notifications ---

const notificationsQueue = new Queue('notifications', { connection });

const notificationsBatch: BatchProcessor = async (jobs: Job[]) => {
  console.log(`[notifications] Sending batch of ${jobs.length} notifications`);

  return jobs.map((j) => {
    console.log(`  → ${j.data.to}: ${j.data.message}`);
    return { sent: true, to: j.data.to };
  });
};

const notificationsWorker = new Worker('notifications', notificationsBatch, {
  connection,
  concurrency: 2,
  batch: { size: 5 },
});

notificationsWorker.on('completed', (job) => console.log(`[notifications] Job ${job.id} sent`));
notificationsWorker.on('error', (err) => console.error('[notifications] Worker error:', err));

// --- Produce jobs ---

console.log('Adding 25 analytics events...');
for (let i = 0; i < 25; i++) {
  await analyticsQueue.add('track', {
    event: `page_view_${i}`,
    userId: `user-${Math.floor(i / 5)}`,
  });
}

console.log('Adding 8 notification jobs...');
for (let i = 0; i < 8; i++) {
  await notificationsQueue.add('send', { to: `user${i}@example.com`, message: `Hello ${i}!` });
}

console.log('\nProcessing... (batches of 10 / 5)\n');
await setTimeout(3000);

const [aCounts, nCounts] = await Promise.all([
  analyticsQueue.getJobCounts(),
  notificationsQueue.getJobCounts(),
]);

console.log('Analytics queue:', aCounts);
console.log('Notifications queue:', nCounts);

// --- Shutdown ---
console.log('\nShutting down...');
await Promise.all([
  analyticsWorker.close(),
  notificationsWorker.close(),
  analyticsQueue.close(),
  notificationsQueue.close(),
]);
process.exit(0);
