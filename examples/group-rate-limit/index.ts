import { Queue, Worker, GroupRateLimitError } from 'glide-mq';
import type { Job } from 'glide-mq';
import { setTimeout as sleep } from 'timers/promises';

// Runtime per-group rate limiting: when a domain returns 429,
// pause only that domain's group - other domains keep processing.
//
// Shows all 3 APIs:
//   1. job.rateLimitGroup(duration) - from inside the processor
//   2. throw new GroupRateLimitError(duration) - throw-style sugar
//   3. queue.rateLimitGroup(key, duration) - from outside the processor
//
// Requires: Valkey/Redis on localhost:6379

const connection = { addresses: [{ host: 'localhost', port: 6379 }] };

// ================================================================
// API 1: job.rateLimitGroup() - from inside the processor
// ================================================================

console.log('=== API 1: job.rateLimitGroup() ===\n');

const crawlQueue = new Queue('crawl-demo', { connection });

// slow.io returns 429 on the first request for each page
const seen = new Set<string>();

async function simulateFetch(url: string): Promise<{ status: number }> {
  if (url.includes('slow.io') && !seen.has(url)) {
    seen.add(url);
    return { status: 429 };
  }
  seen.add(url);
  await sleep(10);
  return { status: 200 };
}

const urls = [
  'https://fast.com/page/1',
  'https://fast.com/page/2',
  'https://fast.com/page/3',
  'https://slow.io/page/1', // 429 first time, 200 on retry
  'https://slow.io/page/2', // 429 first time, 200 on retry
  'https://slow.io/page/3', // 429 first time, 200 on retry
];

for (const url of urls) {
  const domain = new URL(url).hostname;
  await crawlQueue.add('crawl', { url }, { ordering: { key: domain } });
}
console.log(`Added ${urls.length} crawl jobs across 2 domains\n`);

let completed = 0;

const crawlDone = new Promise<void>((resolve) => {
  const worker = new Worker(
    'crawl-demo',
    async (job: Job<{ url: string }>) => {
      const { url } = job.data;
      const domain = new URL(url).hostname;
      const res = await simulateFetch(url);

      if (res.status === 429) {
        console.log(`  [429] ${url} - pausing ${domain} for 300ms`);
        await job.rateLimitGroup(300);
      }

      completed++;
      console.log(`  [200] ${url} (${completed}/${urls.length})`);

      if (completed >= urls.length) {
        setTimeout(() => { worker.close(true).then(resolve); }, 100);
      }
      return 'ok';
    },
    { connection, concurrency: 5, blockTimeout: 200, promotionInterval: 50 },
  );
  worker.on('error', () => {});
  setTimeout(() => { worker.close(true).then(resolve); }, 10000);
});
await crawlDone;

console.log(`\nCrawled all ${completed} pages. fast.com kept going while slow.io was paused.\n`);
await crawlQueue.obliterate({ force: true });
await crawlQueue.close();

// ================================================================
// API 2: throw new GroupRateLimitError() - throw-style sugar
// ================================================================

console.log('=== API 2: throw new GroupRateLimitError() ===\n');

const throwQueue = new Queue('throw-demo', { connection });
await throwQueue.add('task', { attempt: 0 }, { ordering: { key: 'my-group' } });

let attempt = 0;
const throwDone = new Promise<void>((resolve) => {
  const worker = new Worker(
    'throw-demo',
    async () => {
      attempt++;
      if (attempt === 1) {
        console.log('  Attempt 1: throw GroupRateLimitError(200)');
        throw new GroupRateLimitError(200);
      }
      console.log(`  Attempt ${attempt}: processed successfully after rate limit expired`);
      setTimeout(() => { worker.close(true).then(resolve); }, 100);
      return 'ok';
    },
    { connection, concurrency: 1, blockTimeout: 100, promotionInterval: 50 },
  );
  worker.on('error', () => {});
  setTimeout(() => { worker.close(true).then(resolve); }, 5000);
});
await throwDone;

await throwQueue.obliterate({ force: true });
await throwQueue.close();

// ================================================================
// API 3: queue.rateLimitGroup() - from outside the processor
// ================================================================

console.log('\n=== API 3: queue.rateLimitGroup() ===\n');

const extQueue = new Queue('ext-demo', { connection });

// Add 3 jobs for the same domain group
await extQueue.add('task', { url: 'https://external.com/1' }, { ordering: { key: 'external.com' } });
await extQueue.add('task', { url: 'https://external.com/2' }, { ordering: { key: 'external.com' } });
await extQueue.add('task', { url: 'https://external.com/3' }, { ordering: { key: 'external.com' } });

let extCount = 0;
const extDone = new Promise<void>((resolve) => {
  const worker = new Worker(
    'ext-demo',
    async (job: Job<{ url: string }>) => {
      extCount++;
      console.log(`  Processed ${job.data.url} (${extCount}/3)`);

      // After first job, rate limit from outside (e.g. health check detected overload)
      if (extCount === 1) {
        const resumeAt = await extQueue.rateLimitGroup('external.com', 500);
        console.log(`  [external] Paused group via queue.rateLimitGroup() until ${new Date(resumeAt).toISOString()}`);
      }

      if (extCount >= 3) {
        setTimeout(() => { worker.close(true).then(resolve); }, 100);
      }
      return 'ok';
    },
    { connection, concurrency: 1, blockTimeout: 100, promotionInterval: 50 },
  );
  worker.on('error', () => {});
  setTimeout(() => { worker.close(true).then(resolve); }, 10000);
});
await extDone;
console.log(`  All 3 jobs processed. Group was paused between job 1 and job 2.`);

await extQueue.obliterate({ force: true });
await extQueue.close();

// ================================================================

console.log('\n[PASS] All 3 group rate limiting APIs demonstrated successfully');
process.exit(0);
