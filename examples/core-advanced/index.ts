import { Queue, Worker } from 'glide-mq';
import type { Job } from 'glide-mq';
import { setTimeout } from 'timers/promises';

const connection = {
  addresses: [{ host: 'localhost', port: 6379 }],
  clusterMode: false,
};

// --- 1. Compression ---

const reportQueue = new Queue('reports', { connection, compression: 'gzip' });

const reportWorker = new Worker('reports', async (job: Job) => {
  console.log(`Generating ${job.data.type} report (${JSON.stringify(job.data).length} bytes)`);
  for (let i = 0; i <= 100; i += 20) {
    await setTimeout(300);
    await job.updateProgress(i);
  }
  return { reportId: `RPT-${Date.now()}`, pages: 42 };
}, { connection, concurrency: 1 });

// Large payload - compression reduces this by ~98%
await reportQueue.add('annual-report', {
  type: 'annual',
  data: Array.from({ length: 500 }, (_, i) => ({
    id: i,
    revenue: Math.random() * 10000,
    orders: Math.floor(Math.random() * 100),
  })),
});

// --- 2. Rate Limiting ---

const apiQueue = new Queue('api-calls', { connection });

const apiWorker = new Worker('api-calls', async (job: Job) => {
  console.log(`API call: ${job.data.endpoint}`);
  await setTimeout(100);
  return { status: 200 };
}, {
  connection,
  concurrency: 10,
  limiter: { max: 50, duration: 60000 }, // 50 per minute
});

for (let i = 0; i < 10; i++) {
  await apiQueue.add('call', { endpoint: `/api/resource/${i}` });
}

// --- 3. Deduplication ---

const analyticsQueue = new Queue('analytics', { connection });

const analyticsWorker = new Worker('analytics', async (job: Job) => {
  console.log(`Analytics event: ${job.data.event} (user: ${job.data.userId})`);
  return { processed: true };
}, { connection, concurrency: 5 });

// Only the first one will be processed - rest are deduplicated
for (let i = 0; i < 5; i++) {
  await analyticsQueue.add('page-view', {
    event: 'page_view',
    userId: 'USER-123',
    page: '/home',
  }, {
    deduplication: { id: 'pv-home-123', mode: 'simple' },
  });
}
console.log('Added 5 jobs with same dedup ID - only 1 will process');

// --- 4. Dead Letter Queue ---

const flakyQueue = new Queue('flaky', { connection });
const dlq = new Queue('dead-letter', { connection });

const flakyWorker = new Worker('flaky', async (job: Job) => {
  throw new Error(`Intentional failure on attempt ${job.attemptsMade + 1}`);
}, {
  connection,
  concurrency: 3,
  deadLetterQueue: { name: 'dead-letter' },
});

const dlqWorker = new Worker('dead-letter', async (job: Job) => {
  console.log(`DLQ: investigating failed job - ${job.data.reason || 'unknown'}`);
  return { investigated: true };
}, { connection, concurrency: 1 });

await flakyQueue.add('will-fail', { reason: 'testing DLQ' }, { attempts: 2 });

// --- 5. Scheduler (cron) ---
// Schedulers are managed via Queue - no separate Scheduler import needed

await reportQueue.upsertJobScheduler('daily-report', {
  pattern: '0 9 * * *', // 9 AM daily
}, {
  name: 'scheduled-report',
  data: { type: 'daily-summary' },
});
console.log('Scheduler: daily report at 9 AM registered');

await setTimeout(5000);

// --- Shutdown ---

console.log('Shutting down...');
await Promise.all([
  reportWorker.close(), apiWorker.close(), analyticsWorker.close(),
  flakyWorker.close(), dlqWorker.close(),
  reportQueue.close(), apiQueue.close(), analyticsQueue.close(),
  flakyQueue.close(), dlq.close(),
]);
process.exit(0);
