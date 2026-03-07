import { Queue, Worker } from 'glide-mq';
import type { Job } from 'glide-mq';
import { setTimeout } from 'timers/promises';

const connection = { addresses: [{ host: 'localhost', port: 6379 }] };

const queue = new Queue('scheduled-tasks', { connection });
const worker = new Worker('scheduled-tasks', async (job: Job) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] Running: ${job.name} | scheduler: ${job.data.scheduler}`);
  return { ran: true, at: ts };
}, { connection, concurrency: 3, promotionInterval: 200 });

worker.on('error', (err) => console.error('Worker error:', err));

// --- 1. Fixed interval scheduler ---
// Fires every N milliseconds (drift-free, server-side scheduling).

await queue.upsertJobScheduler(
  'heartbeat',
  { every: 1000 },
  { name: 'ping', data: { scheduler: 'heartbeat' } },
);
console.log('Scheduler: heartbeat (every 1s)');

// --- 2. Cron pattern scheduler ---
// Standard 5-field cron: minute hour dayOfMonth month dayOfWeek.
// This one fires every minute (for demo - use real patterns in production).

await queue.upsertJobScheduler(
  'hourly-cleanup',
  { pattern: '* * * * *' }, // every minute
  { name: 'cleanup', data: { scheduler: 'hourly-cleanup', target: 'temp-files' } },
);
console.log('Scheduler: hourly-cleanup (cron: every minute)');

// --- 3. Cron with timezone ---
// Run at a specific time in a specific timezone.

await queue.upsertJobScheduler(
  'daily-report-us',
  {
    pattern: '0 9 * * *', // 9:00 AM
    tz: 'America/New_York',
  },
  { name: 'report', data: { scheduler: 'daily-report-us', region: 'US-East' } },
);
console.log('Scheduler: daily-report-us (cron: 9 AM ET)');

// --- 4. Interval with startDate ---
// Delay the first run until a future time.

await queue.upsertJobScheduler(
  'delayed-start',
  {
    every: 800,
    startDate: Date.now() + 2000, // first run 2s from now
  },
  { name: 'delayed-task', data: { scheduler: 'delayed-start' } },
);
console.log('Scheduler: delayed-start (every 800ms, starts in 2s)');

// --- Verify schedulers exist ---
const schedulerNames = ['heartbeat', 'hourly-cleanup', 'daily-report-us', 'delayed-start'];
console.log('\nActive schedulers:');
const entries = await Promise.all(schedulerNames.map((name) => queue.getJobScheduler(name)));
schedulerNames.forEach((name, i) => {
  if (entries[i]) {
    console.log(`  ${name} | next: ${new Date(entries[i]!.nextRun).toISOString()}`);
  }
});

// --- Observe runs ---
console.log('\nWaiting 4s to observe scheduled runs...\n');
await setTimeout(4000);

const counts = await queue.getJobCounts();
console.log('\nJob counts:', counts);

// --- Remove schedulers ---
await Promise.all(schedulerNames.map((name) => queue.removeJobScheduler(name)));
console.log('All schedulers removed.');

// --- Shutdown ---
await worker.close();
await queue.close();
console.log('Done.');
