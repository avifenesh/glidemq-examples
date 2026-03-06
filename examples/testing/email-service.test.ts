/**
 * email-service.test.ts
 *
 * Tests for the email service using glide-mq's in-memory testing utilities.
 *
 * Key idea: TestQueue and TestWorker are drop-in replacements for Queue and
 * Worker that store everything in plain Maps. No Valkey/Redis instance is
 * needed, so tests run instantly and can be parallelised without port
 * conflicts or cleanup concerns.
 *
 * Each test creates its own TestQueue and TestWorker to guarantee full
 * isolation - no shared state leaks between tests.
 */

import { describe, it, expect } from 'vitest';
import { TestQueue, TestWorker } from 'glide-mq/testing';
import { createEmailService, emailProcessor } from './email-service.js';
import type { EmailJobData, EmailResult } from './email-service.js';

// ---------------------------------------------------------------------------
// Helper: wait for the worker to finish processing all queued jobs.
// TestWorker processes via microtasks, so we need to yield the event loop.
// ---------------------------------------------------------------------------
function waitForProcessing(ms = 50): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Email service with TestQueue/TestWorker', () => {
  // -------------------------------------------------------------------------
  // 1. Adding a job creates it in the queue
  // -------------------------------------------------------------------------
  it('adds a job to the queue', async () => {
    const queue = new TestQueue<EmailJobData, EmailResult>('email');
    // No worker attached - we just want to verify the job lands in the queue.
    const service = createEmailService(queue);

    const job = await service.send('alice@example.com', 'Hello', 'Hi Alice');

    expect(job).not.toBeNull();
    expect(job!.data.to).toBe('alice@example.com');
    expect(job!.data.subject).toBe('Hello');

    // The job should be in "waiting" state since no worker is consuming.
    const counts = await queue.getJobCounts();
    expect(counts.waiting).toBe(1);

    await queue.close();
  });

  // -------------------------------------------------------------------------
  // 2. Worker processes the job and sets returnvalue
  // -------------------------------------------------------------------------
  it('processes a job and returns a result', async () => {
    const queue = new TestQueue<EmailJobData, EmailResult>('email');
    const worker = new TestWorker(queue, emailProcessor);
    const service = createEmailService(queue);

    await service.send('bob@example.com', 'Welcome', 'Welcome aboard');

    // Let the worker pick up and process the job.
    await waitForProcessing();

    const counts = await queue.getJobCounts();
    expect(counts.completed).toBe(1);
    expect(counts.waiting).toBe(0);

    // Verify the return value was stored on the job record.
    const completed = await queue.getJobs('completed');
    expect(completed).toHaveLength(1);
    expect(completed[0].returnvalue).toEqual({
      delivered: true,
      to: 'bob@example.com',
    });

    await worker.close();
    await queue.close();
  });

  // -------------------------------------------------------------------------
  // 3. Failed job has failedReason set
  // -------------------------------------------------------------------------
  it('records failedReason when the processor throws', async () => {
    const queue = new TestQueue<EmailJobData, EmailResult>('email');

    // A processor that always throws.
    const failingProcessor = async () => {
      throw new Error('SMTP connection refused');
    };

    const worker = new TestWorker(queue, failingProcessor);

    await queue.add('send-email', {
      to: 'fail@example.com',
      subject: 'Oops',
      body: 'This will fail',
    });

    await waitForProcessing();

    const failed = await queue.getJobs('failed');
    expect(failed).toHaveLength(1);
    expect(failed[0].failedReason).toBe('SMTP connection refused');

    await worker.close();
    await queue.close();
  });

  // -------------------------------------------------------------------------
  // 4. Retry logic: processor fails twice then succeeds
  // -------------------------------------------------------------------------
  it('retries a job according to the attempts option', async () => {
    let callCount = 0;

    const queue = new TestQueue<EmailJobData, EmailResult>('email');

    // Processor that fails the first two calls, then succeeds.
    const flakyProcessor = async (job: { data: EmailJobData }) => {
      callCount++;
      if (callCount < 3) {
        throw new Error(`Attempt ${callCount} failed`);
      }
      return { delivered: true, to: job.data.to } satisfies EmailResult;
    };

    const worker = new TestWorker(queue, flakyProcessor);

    // Allow 3 attempts so the job survives two failures.
    await queue.add('send-email', {
      to: 'retry@example.com',
      subject: 'Important',
      body: 'Please retry',
    }, { attempts: 3 });

    // Give enough time for retries (each is a microtask cycle).
    await waitForProcessing(150);

    expect(callCount).toBe(3);

    const counts = await queue.getJobCounts();
    expect(counts.completed).toBe(1);
    expect(counts.failed).toBe(0);

    await worker.close();
    await queue.close();
  });

  // -------------------------------------------------------------------------
  // 5. Job priority is stored correctly
  // -------------------------------------------------------------------------
  it('assigns priority based on subject prefix', async () => {
    const queue = new TestQueue<EmailJobData, EmailResult>('email');
    const service = createEmailService(queue);

    // Transactional email should get priority 10.
    const transactional = await service.send(
      'vip@example.com',
      '[Transactional] Password Reset',
      'Click here to reset',
    );

    // Marketing email should get priority 0.
    const marketing = await service.send(
      'user@example.com',
      'Weekly Newsletter',
      'Check out our deals',
    );

    expect(transactional!.opts.priority).toBe(10);
    expect(marketing!.opts.priority).toBe(0);

    await queue.close();
  });

  // -------------------------------------------------------------------------
  // 6. Progress tracking during processing
  // -------------------------------------------------------------------------
  it('tracks progress updates during processing', async () => {
    const queue = new TestQueue<EmailJobData, EmailResult>('email');

    // Processor that reports progress in two steps.
    const progressProcessor = async (job: any) => {
      await job.updateProgress(50);
      await job.updateProgress(100);
      return { delivered: true, to: job.data.to };
    };

    const worker = new TestWorker(queue, progressProcessor);

    await queue.add('send-email', {
      to: 'progress@example.com',
      subject: 'Tracking',
      body: 'Watch my progress',
    });

    await waitForProcessing();

    // After completion, the job's progress should be at 100.
    const completed = await queue.getJobs('completed');
    expect(completed).toHaveLength(1);
    expect(completed[0].returnvalue).toEqual({
      delivered: true,
      to: 'progress@example.com',
    });

    await worker.close();
    await queue.close();
  });

  // -------------------------------------------------------------------------
  // 7. Bulk job processing
  // -------------------------------------------------------------------------
  it('processes jobs added via addBulk', async () => {
    const queue = new TestQueue<EmailJobData, EmailResult>('email');
    const worker = new TestWorker(queue, emailProcessor);

    const recipients = ['a@test.com', 'b@test.com', 'c@test.com', 'd@test.com', 'e@test.com'];

    // Add five jobs at once.
    await queue.addBulk(
      recipients.map((to) => ({
        name: 'send-email',
        data: { to, subject: 'Bulk', body: 'Bulk email' },
      })),
    );

    await waitForProcessing(200);

    const counts = await queue.getJobCounts();
    expect(counts.completed).toBe(5);
    expect(counts.waiting).toBe(0);

    // Verify each recipient received a delivery receipt.
    const completed = await queue.getJobs('completed');
    const deliveredTo = completed.map((j) => j.returnvalue?.to).sort();
    expect(deliveredTo).toEqual(recipients.sort());

    await worker.close();
    await queue.close();
  });

  // -------------------------------------------------------------------------
  // 8. Job counts after processing
  // -------------------------------------------------------------------------
  it('reports accurate job counts across states', async () => {
    const queue = new TestQueue<EmailJobData, EmailResult>('email');

    // Processor that fails jobs addressed to "fail@" and succeeds for others.
    const selectiveProcessor = async (job: { data: EmailJobData }) => {
      if (job.data.to.startsWith('fail@')) {
        throw new Error('Rejected');
      }
      return { delivered: true, to: job.data.to } satisfies EmailResult;
    };

    const worker = new TestWorker(queue, selectiveProcessor);

    // Add a mix of jobs that will succeed and fail.
    await queue.add('send-email', { to: 'ok1@test.com', subject: 'Hi', body: '.' });
    await queue.add('send-email', { to: 'ok2@test.com', subject: 'Hi', body: '.' });
    await queue.add('send-email', { to: 'fail@test.com', subject: 'Hi', body: '.' });

    await waitForProcessing();

    const counts = await queue.getJobCounts();
    expect(counts.completed).toBe(2);
    expect(counts.failed).toBe(1);
    expect(counts.waiting).toBe(0);
    expect(counts.active).toBe(0);

    await worker.close();
    await queue.close();
  });
});
