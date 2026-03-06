/**
 * Next.js API Routes — Producer-Only Pattern
 *
 * This file illustrates what your Next.js API routes would look like.
 * It is NOT a runnable Next.js app — it shows the code you would place in
 * your actual route files (e.g. app/api/jobs/route.ts).
 *
 * Key idea: the Next.js app only PRODUCES jobs. A separate long-lived
 * worker process (worker.ts) consumes them. This is necessary because
 * Vercel and other serverless platforms kill functions after a short
 * timeout — you cannot run a persistent Worker inside a serverless function.
 */

import { Queue } from 'glide-mq';
import type { Job } from 'glide-mq';

// ---------------------------------------------------------------------------
// Shared queue connection (reuse across requests)
// ---------------------------------------------------------------------------

// In a real Next.js app you would put this in a shared module,
// e.g. lib/queue.ts, and import it from every route that needs it.
// Module-level singletons survive across requests in Node.js / long-running
// Next.js servers, giving you connection reuse for free.

const connection = {
  addresses: [{ host: 'localhost', port: 6379 }],
  clusterMode: false,
};

let _queue: Queue | null = null;

function getQueue(): Queue {
  if (!_queue) {
    _queue = new Queue('jobs', { connection });
  }
  return _queue;
}

// ---------------------------------------------------------------------------
// POST /api/jobs — Add a job to the queue
// ---------------------------------------------------------------------------
// In production this file would live at: app/api/jobs/route.ts

export async function POST(request: Request) {
  const body = await request.json();
  const { type, payload } = body;

  const queue = getQueue();

  // Queue.add() returns the Job, or null if deduplication skipped it.
  const job = await queue.add(type, payload, {
    // Deduplicate by a unique key so the same request sent twice
    // does not create two jobs.
    jobId: payload.idempotencyKey,
  });

  if (!job) {
    // Dedup kicked in — a job with this ID already exists.
    return Response.json(
      { queued: false, reason: 'duplicate', jobId: payload.idempotencyKey },
      { status: 200 },
    );
  }

  return Response.json({ queued: true, jobId: job.id }, { status: 201 });
}

// ---------------------------------------------------------------------------
// GET /api/jobs/[id] — Check job status
// ---------------------------------------------------------------------------
// In production this file would live at: app/api/jobs/[id]/route.ts

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const queue = getQueue();
  const job = await queue.getJob(params.id);

  if (!job) {
    return Response.json({ error: 'Job not found' }, { status: 404 });
  }

  const state = await job.getState();

  return Response.json({
    jobId: job.id,
    state, // "waiting" | "active" | "completed" | "failed" | ...
    data: job.data,
    returnvalue: job.returnvalue,
    failedReason: job.failedReason,
    progress: job.progress,
  });
}

// ---------------------------------------------------------------------------
// Server Action — Queue a background task from a React Server Component
// ---------------------------------------------------------------------------
// In production this would be in a file with "use server" at the top,
// e.g. app/actions/send-report.ts

async function sendReportAction(reportId: string) {
  'use server';

  const queue = getQueue();

  const job = await queue.add('generate-report', { reportId }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });

  if (!job) {
    return { success: false, reason: 'duplicate' };
  }

  return { success: true, jobId: job.id };
}
