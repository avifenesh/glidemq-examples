import { Queue, Worker } from 'glide-mq';
import type { Job } from 'glide-mq';
import { setTimeout } from 'timers/promises';

const connection = { addresses: [{ host: 'localhost', port: 6379 }] };

const queue = new Queue('scheduled', { connection });
const worker = new Worker('scheduled', async (job: Job) => {
  console.log(`[${new Date().toISOString()}] Running: ${job.name} (scheduler: ${job.data.scheduler})`);
  return { ran: true };
}, { connection, concurrency: 2 });

worker.on('error', (err) => console.error('Worker error:', err));

// --- 1. Bounded by execution count (limit) ---
// Runs at most 3 times, then the scheduler stops automatically.

await queue.upsertJobScheduler(
  'trial-digest',
  {
    every: 500, // every 500ms
    limit: 3,   // stop after 3 executions
  },
  {
    name: 'send-digest',
    data: { scheduler: 'trial-digest' },
  },
);
console.log('Scheduled: trial-digest (max 3 runs, every 500ms)');

// --- 2. Bounded by end date ---
// Stops running after the given date regardless of how many times it ran.

const endsAt = Date.now() + 2000; // stop after 2 seconds

await queue.upsertJobScheduler(
  'limited-campaign',
  {
    every: 400,
    endDate: endsAt,
  },
  {
    name: 'campaign-ping',
    data: { scheduler: 'limited-campaign' },
  },
);
console.log('Scheduled: limited-campaign (ends in 2s, every 400ms)');

// --- 3. Bounded by both limit AND end date (whichever comes first) ---

await queue.upsertJobScheduler(
  'onboarding-reminder',
  {
    every: 600,
    limit: 5,
    endDate: Date.now() + 5000,
  },
  {
    name: 'onboarding-reminder',
    data: { scheduler: 'onboarding-reminder' },
  },
);
console.log('Scheduled: onboarding-reminder (max 5 runs OR 5s, every 600ms)\n');

// Wait for schedulers to fire and expire
await setTimeout(4000);

const counts = await queue.getJobCounts();
console.log('\nFinal job counts:', counts);

// --- Shutdown ---
await worker.close();
await queue.close();
console.log('Done.');
process.exit(0);
