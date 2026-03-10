/**
 * High-throughput worker example - events/metrics opt-out (v0.10+)
 *
 * Demonstrates the `events: false` and `metrics: false` WorkerOptions that
 * skip server-side bookkeeping in the hot path, reducing redis calls per job
 * and improving throughput when you don't need QueueEvents or getMetrics().
 */

import { Queue, Worker, gracefulShutdown } from 'glide-mq';
import type { Job } from 'glide-mq';

const connection = {
  addresses: [{ host: 'localhost', port: 6379 }],
  clusterMode: false,
};

const JOBS_PER_RUN = 1_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeJobs(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    name: 'work',
    data: { index: i },
  }));
}

/** Returns a promise that resolves when `target` jobs have been completed. */
function waitForAll(worker: Worker, target: number): Promise<number> {
  const start = performance.now();
  let completed = 0;
  return new Promise<number>((resolve) => {
    worker.on('completed', () => {
      completed++;
      if (completed >= target) {
        resolve(performance.now() - start);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Run 1 - Fast worker: events and metrics disabled
// ---------------------------------------------------------------------------

const fastQueue = new Queue('high-throughput-fast', { connection });

/**
 * events: false  - skips the XADD call that publishes to the Valkey event
 *                  stream on every job completion. Saves ~1 redis.call per job.
 *
 * metrics: false - skips the HINCRBY call that records per-minute timing
 *                  metrics in Valkey on every completion. Saves ~1-2
 *                  redis.call per job.
 *
 * These are safe to disable when:
 *   - You are NOT consuming server-side events via QueueEvents.
 *   - You are NOT calling queue.getMetrics() for dashboards or monitoring.
 *
 * Important: the TypeScript-side EventEmitter still works. worker.on('completed', ...)
 * fires normally because it is driven by the local process, not the Valkey stream.
 */
const fastWorker = new Worker(
  'high-throughput-fast',
  async (_job: Job) => {
    // Simulate minimal CPU work
  },
  {
    connection,
    concurrency: 10,
    events: false,
    metrics: false,
  },
);

console.log(`Adding ${JOBS_PER_RUN} jobs (run 1 - events/metrics OFF)...`);
await fastQueue.addBulk(makeJobs(JOBS_PER_RUN));

const fastDone = waitForAll(fastWorker, JOBS_PER_RUN);
const fastMs = await fastDone;

console.log(
  `[Run 1] events:false, metrics:false  => ${JOBS_PER_RUN} jobs in ${fastMs.toFixed(0)} ms ` +
    `(${((JOBS_PER_RUN / fastMs) * 1000).toFixed(0)} jobs/s)`,
);

// Close run-1 worker so it doesn't compete for CPU during run 2
await fastWorker.close();

// ---------------------------------------------------------------------------
// Run 2 - Baseline worker: events and metrics enabled (defaults)
// ---------------------------------------------------------------------------

const baselineQueue = new Queue('high-throughput-baseline', { connection });

const baselineWorker = new Worker(
  'high-throughput-baseline',
  async (_job: Job) => {
    // Same minimal work
  },
  {
    connection,
    concurrency: 10,
    // events and metrics default to true
  },
);

console.log(`\nAdding ${JOBS_PER_RUN} jobs (run 2 - events/metrics ON)...`);
await baselineQueue.addBulk(makeJobs(JOBS_PER_RUN));

const baselineDone = waitForAll(baselineWorker, JOBS_PER_RUN);
const baselineMs = await baselineDone;

console.log(
  `[Run 2] events:true,  metrics:true   => ${JOBS_PER_RUN} jobs in ${baselineMs.toFixed(0)} ms ` +
    `(${((JOBS_PER_RUN / baselineMs) * 1000).toFixed(0)} jobs/s)`,
);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

const speedup = ((baselineMs - fastMs) / baselineMs) * 100;
console.log(
  `\nResult: disabling events+metrics was ${speedup > 0 ? 'faster' : 'slower'} ` +
    `by ${Math.abs(speedup).toFixed(1)}%`,
);
if (speedup > 0) {
  console.log(
    'Tip: the savings grow with concurrency and smaller job payloads, where ' +
      'the per-job redis overhead is a larger fraction of total time.',
  );
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

const handle = gracefulShutdown([fastQueue, baselineQueue, baselineWorker]);
await handle.shutdown();
console.log('\nDone.');
