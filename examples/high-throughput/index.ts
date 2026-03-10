/**
 * High-throughput worker example - events/metrics opt-out (v0.10+)
 *
 * Demonstrates the `events: false` and `metrics: false` WorkerOptions that
 * skip server-side bookkeeping in the hot path, reducing redis calls per job.
 */

import { Queue, Worker } from 'glide-mq';
import type { Job } from 'glide-mq';

const connection = {
  addresses: [{ host: 'localhost', port: 6379 }],
  clusterMode: false,
};

const JOBS_PER_RUN = 500;

function makeJobs(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    name: 'work',
    data: { index: i },
  }));
}

async function runBenchmark(
  queueName: string,
  workerOpts: { events?: boolean; metrics?: boolean },
  label: string,
): Promise<number> {
  const queue = new Queue(queueName, { connection });
  let completed = 0;

  const ms = await new Promise<number>((resolve) => {
    const start = performance.now();
    const worker = new Worker(
      queueName,
      async (_job: Job) => {
        // Minimal work
      },
      { connection, concurrency: 10, ...workerOpts },
    );
    worker.on('error', () => {});
    worker.on('completed', () => {
      completed++;
      if (completed >= JOBS_PER_RUN) {
        const elapsed = performance.now() - start;
        worker.close().then(() => resolve(elapsed));
      }
    });

    // Add jobs after worker is created and listening for events
    queue.addBulk(makeJobs(JOBS_PER_RUN));
  });

  console.log(
    `[${label}] ${JOBS_PER_RUN} jobs in ${ms.toFixed(0)} ms ` +
      `(${((JOBS_PER_RUN / ms) * 1000).toFixed(0)} jobs/s)`,
  );
  await queue.close();
  return ms;
}

// ---------------------------------------------------------------------------
// Run benchmarks
// ---------------------------------------------------------------------------

console.log('=== High-Throughput Worker: events/metrics opt-out ===\n');

/**
 * events: false  - skips XADD to the event stream per completion (~1 redis call saved)
 * metrics: false - skips HINCRBY to the metrics hash per completion (~1 redis call saved)
 *
 * Safe when you don't consume server-side events via QueueEvents or getMetrics().
 * The TS-side EventEmitter (worker.on('completed', ...)) still works normally.
 */
const fastMs = await runBenchmark(
  `ht-fast-${Date.now()}`,
  { events: false, metrics: false },
  'events:OFF  metrics:OFF ',
);

const baseMs = await runBenchmark(
  `ht-base-${Date.now()}`,
  {},
  'events:ON   metrics:ON  ',
);

// Summary
const speedup = ((baseMs - fastMs) / baseMs) * 100;
console.log(
  `\nResult: disabling events+metrics was ${speedup > 0 ? 'faster' : 'slower'} ` +
    `by ${Math.abs(speedup).toFixed(1)}%`,
);

console.log('\nDone.');
process.exit(0);
