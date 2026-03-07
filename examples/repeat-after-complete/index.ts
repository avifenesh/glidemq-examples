import { Queue, Worker } from 'glide-mq';
import type { Job } from 'glide-mq';
import { setTimeout } from 'timers/promises';

const connection = { addresses: [{ host: 'localhost', port: 6379 }] };

// repeatAfterComplete schedules the next run only AFTER the current one finishes.
// This prevents pile-up when a job takes longer than the interval.

// --- 1. Scraper that must not overlap ---
// With a fixed cron/interval, a slow scrape would queue up multiple pending runs.
// With repeatAfterComplete, the next run waits for the current to finish.

const scrapeQueue = new Queue('scraper', { connection });
let scrapeRuns = 0;

const scrapeWorker = new Worker('scraper', async (job: Job) => {
  scrapeRuns++;
  const run = scrapeRuns;
  const duration = 300 + Math.floor(Math.random() * 200); // 300-500ms
  console.log(`[scraper] Run #${run} started (will take ${duration}ms)`);
  await setTimeout(duration);
  console.log(`[scraper] Run #${run} finished`);
  return { run, duration };
}, { connection, concurrency: 1, promotionInterval: 200 });

scrapeWorker.on('error', (err) => console.error('[scraper] Error:', err));

await scrapeQueue.upsertJobScheduler(
  'scrape-products',
  {
    repeatAfterComplete: 100, // 100ms delay after completion before next run
  },
  {
    name: 'scrape',
    data: { url: 'https://example.com/products' },
  },
);
console.log('Scheduler: scrape-products (repeatAfterComplete, 100ms gap after each run)\n');

// --- 2. Report generator with cool-down ---

const reportQueue = new Queue('reports', { connection });
let reportRuns = 0;

const reportWorker = new Worker('reports', async (job: Job) => {
  reportRuns++;
  console.log(`[reports] Generating report #${reportRuns} for ${job.data.period}`);
  await setTimeout(200);
  return { reportId: `RPT-${reportRuns}` };
}, { connection, concurrency: 1, promotionInterval: 200 });

reportWorker.on('error', (err) => console.error('[reports] Error:', err));

await reportQueue.upsertJobScheduler(
  'daily-report',
  {
    repeatAfterComplete: 500, // 500ms cool-down between reports
  },
  {
    name: 'generate',
    data: { period: 'daily' },
  },
);
console.log('Scheduler: daily-report (repeatAfterComplete, 500ms cool-down)\n');

// Observe a few cycles
await setTimeout(3000);

const [scraperCounts, reportCounts] = await Promise.all([
  scrapeQueue.getJobCounts(),
  reportQueue.getJobCounts(),
]);

console.log(`\nScraper runs completed: ${scrapeRuns} |`, scraperCounts);
console.log(`Report runs completed: ${reportRuns} |`, reportCounts);

// --- Shutdown ---
await Promise.all([scrapeWorker.close(), reportWorker.close(), scrapeQueue.close(), reportQueue.close()]);
console.log('\nDone.');
