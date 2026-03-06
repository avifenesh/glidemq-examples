/**
 * Standalone Worker Process
 *
 * This runs OUTSIDE of Next.js as a long-lived process. Deploy it as:
 *   - A separate Docker container / service
 *   - A PM2 managed process
 *   - A systemd service
 *   - A Fly.io / Railway / Render background worker
 *
 * It connects to the same Valkey/Redis instance as your Next.js app
 * and processes the jobs that the API routes produce.
 */

import { Worker } from 'glide-mq';
import type { Job } from 'glide-mq';

const connection = {
  addresses: [{ host: 'localhost', port: 6379 }],
  clusterMode: false,
};

// ---------------------------------------------------------------------------
// Worker definition
// ---------------------------------------------------------------------------

const worker = new Worker('jobs', async (job: Job) => {
  console.log(`[worker] Processing ${job.name} (${job.id}):`, job.data);

  // Route to the right handler based on job name
  switch (job.name) {
    case 'generate-report': {
      await job.updateProgress(10);
      // ... generate the report ...
      await job.log('Report generated');
      await job.updateProgress(80);
      // ... upload to S3, send email, etc. ...
      await job.updateProgress(100);
      return { reportUrl: `https://cdn.example.com/reports/${job.data.reportId}.pdf` };
    }

    default: {
      await job.updateProgress(50);
      // Generic processing placeholder
      await job.log(`Processed ${job.name}`);
      await job.updateProgress(100);
      return { processed: true };
    }
  }
}, { connection, concurrency: 5 });

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

worker.on('completed', (job) => {
  console.log(`[worker] Completed ${job.id} ->`, job.returnvalue);
});

worker.on('failed', (job, err) => {
  console.error(`[worker] Failed ${job.id}:`, err.message);
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

console.log('[worker] Listening for jobs on "jobs" queue (concurrency: 5)');
console.log('[worker] Press Ctrl+C to stop.');

async function shutdown() {
  console.log('[worker] Shutting down...');
  await worker.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
