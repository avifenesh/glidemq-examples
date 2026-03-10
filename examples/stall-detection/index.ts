/**
 * Stall Detection Example
 *
 * Demonstrates how glide-mq detects and recovers stalled (hung) jobs for both
 * stream-sourced and list-sourced (LIFO/priority) workers.
 *
 * How stall detection works:
 *
 *   stalledInterval - How often (ms) the scheduler scans for stalled jobs.
 *     Default: 30000. We use 2000 here so the demo runs quickly.
 *
 *   maxStalledCount - How many consecutive stall cycles a job survives before
 *     being moved to the failed set. Default: 1. With maxStalledCount=1,
 *     the first stall detection increments the counter and emits a 'stalled'
 *     event; the second detection (counter > max) moves the job to 'failed'.
 *
 *   lockDuration - Heartbeat interval for active jobs. The worker writes
 *     a lastActive timestamp every lockDuration/2 ms. Jobs whose lastActive
 *     is older than stalledInterval are considered stalled. Default: 30000.
 *     We use a short value here so the heartbeat stops mattering quickly.
 *
 * Two recovery mechanisms:
 *
 *   Stream jobs (default FIFO):
 *     Detected via XAUTOCLAIM - the scheduler's glidemq_reclaimStalled function
 *     uses XAUTOCLAIM to find stream entries that have been pending longer than
 *     stalledInterval without acknowledgment. This is the existing mechanism
 *     that has been in glide-mq since the beginning.
 *
 *   List jobs (LIFO / priority):
 *     These jobs are popped from a Redis list, not read from a stream, so
 *     XAUTOCLAIM cannot see them. New in v0.11: glidemq_reclaimStalledListJobs
 *     uses a bounded SCAN over the active job set to find list-sourced jobs
 *     whose lastActive timestamp is stale. The same applyStalledLogic applies:
 *     increment stalledCount, emit 'stalled', and fail after maxStalledCount.
 *
 * Requires Valkey/Redis on localhost:6379.
 */

import { Queue, Worker, QueueEvents, gracefulShutdown } from 'glide-mq';
import type { Job } from 'glide-mq';
import { setTimeout as sleep } from 'timers/promises';

const connection = { addresses: [{ host: 'localhost', port: 6379 }] };

const STALLED_INTERVAL = 2000; // Check for stalled jobs every 2s
const MAX_STALLED_COUNT = 1;   // Fail after 1 stall detection cycle
const LOCK_DURATION = 2000;    // Heartbeat window - short so stalls are detected fast

// --- Setup ---

const queue = new Queue('stall-demo', { connection });
const events = new QueueEvents('stall-demo', { connection });

// Track events for the demo
const stalledJobs: string[] = [];
const failedJobs: string[] = [];
const completedJobs: string[] = [];

events.on('stalled', ({ jobId }) => {
  console.log(`  [event] STALLED - job ${jobId} detected as hung`);
  stalledJobs.push(jobId);
});

events.on('failed', ({ jobId, failedReason }) => {
  console.log(`  [event] FAILED  - job ${jobId}: ${failedReason}`);
  failedJobs.push(jobId);
});

events.on('completed', ({ jobId }) => {
  console.log(`  [event] DONE    - job ${jobId} completed successfully`);
  completedJobs.push(jobId);
});

// --- Part 1: Stream-sourced job (default FIFO) ---

console.log('=== Part 1: Stream job stall detection (XAUTOCLAIM) ===\n');

// Worker 1 simulates a crash: it picks up the job but never resolves the promise.
// Without a heartbeat update, the scheduler will flag this job as stalled.
const hungWorker1 = new Worker('stall-demo', async (_job: Job) => {
  console.log(`  [hung-worker] Picked up stream job ${_job.id} - hanging forever...`);
  // Simulate a hung process: never resolve
  return new Promise<void>(() => {});
}, {
  connection,
  concurrency: 1,
  stalledInterval: STALLED_INTERVAL,
  maxStalledCount: MAX_STALLED_COUNT,
  lockDuration: LOCK_DURATION,
});
hungWorker1.on('error', () => {});

// Wait for the worker to be ready before adding jobs
await sleep(500);

const streamJob = await queue.add('stream-task', {
  type: 'stream',
  payload: 'This job will be picked up and hung',
});
console.log(`  Added stream job: ${streamJob.id}`);

// Wait for the hung worker to pick it up
await sleep(1000);

// Now close the hung worker - simulating a crash.
// The job is still in the PEL (Pending Entries List) with no ACK.
await hungWorker1.close(true);
console.log('  Hung worker closed (simulating crash).\n');

// Worker 2 is a healthy worker that will process reclaimed jobs.
console.log('  Starting healthy worker - waiting for stall detection...\n');

let streamRecovered = false;
const healthyWorker1 = new Worker('stall-demo', async (job: Job) => {
  console.log(`  [healthy-worker] Processing reclaimed stream job ${job.id}`);
  streamRecovered = true;
  return { recovered: true };
}, {
  connection,
  concurrency: 1,
  stalledInterval: STALLED_INTERVAL,
  maxStalledCount: MAX_STALLED_COUNT,
  lockDuration: LOCK_DURATION,
});
healthyWorker1.on('error', () => {});

// Wait for stall detection cycles: first cycle marks as stalled, second may fail it.
// With maxStalledCount=1, the job gets one stalled event then either gets reclaimed
// or moves to failed on the next cycle.
await sleep(STALLED_INTERVAL * 3 + 1000);
await healthyWorker1.close();

if (streamRecovered) {
  console.log('\n  Stream job was reclaimed and processed successfully.');
} else {
  console.log('\n  Stream job was moved to failed after exceeding maxStalledCount.');
}

// --- Part 2: List-sourced job (LIFO) - new in v0.11 ---

console.log('\n=== Part 2: LIFO job stall detection (bounded SCAN - new in v0.11) ===\n');
console.log('  List-sourced jobs (lifo: true or priority) are popped from a Redis list,');
console.log('  not consumed via XREADGROUP. XAUTOCLAIM cannot detect them as stalled.');
console.log('  v0.11 adds glidemq_reclaimStalledListJobs: a bounded SCAN over active');
console.log('  jobs that detects stale lastActive timestamps for list-sourced jobs.\n');

// Worker that hangs on LIFO jobs
const hungWorker2 = new Worker('stall-demo', async (_job: Job) => {
  console.log(`  [hung-worker] Picked up LIFO job ${_job.id} - hanging forever...`);
  return new Promise<void>(() => {});
}, {
  connection,
  concurrency: 1,
  stalledInterval: STALLED_INTERVAL,
  maxStalledCount: MAX_STALLED_COUNT,
  lockDuration: LOCK_DURATION,
});
hungWorker2.on('error', () => {});

await sleep(500);

const lifoJob = await queue.add('lifo-task', {
  type: 'lifo',
  payload: 'This LIFO job will be picked up and hung',
}, { lifo: true });
console.log(`  Added LIFO job: ${lifoJob.id} (lifo: true)`);

// Wait for the hung worker to pick it up
await sleep(1000);

// Close the hung worker - simulating a crash
await hungWorker2.close(true);
console.log('  Hung worker closed (simulating crash).\n');

// Healthy worker to process the reclaimed LIFO job
console.log('  Starting healthy worker - waiting for stall detection...\n');

let lifoRecovered = false;
const healthyWorker2 = new Worker('stall-demo', async (job: Job) => {
  console.log(`  [healthy-worker] Processing reclaimed LIFO job ${job.id}`);
  lifoRecovered = true;
  return { recovered: true };
}, {
  connection,
  concurrency: 1,
  stalledInterval: STALLED_INTERVAL,
  maxStalledCount: MAX_STALLED_COUNT,
  lockDuration: LOCK_DURATION,
});
healthyWorker2.on('error', () => {});

await sleep(STALLED_INTERVAL * 3 + 1000);
await healthyWorker2.close();

if (lifoRecovered) {
  console.log('\n  LIFO job was reclaimed and processed successfully.');
} else {
  console.log('\n  LIFO job was moved to failed after exceeding maxStalledCount.');
}

// --- Summary ---

console.log('\n=== Summary ===\n');
console.log(`  Stalled events received: ${stalledJobs.length} (${stalledJobs.join(', ') || 'none'})`);
console.log(`  Failed events received:  ${failedJobs.length} (${failedJobs.join(', ') || 'none'})`);
console.log(`  Completed events:        ${completedJobs.length} (${completedJobs.join(', ') || 'none'})`);
console.log();
console.log('  Key takeaways:');
console.log('  - Stream jobs: stall detected via XAUTOCLAIM (pending entry age)');
console.log('  - List jobs:   stall detected via bounded SCAN (lastActive timestamp)');
console.log('  - Both paths use the same stalledCount / maxStalledCount logic');
console.log('  - Both emit "stalled" and "failed" events through QueueEvents');

// --- Cleanup ---

await events.close();
await queue.close();
console.log('\nDone.');
process.exit(0);
