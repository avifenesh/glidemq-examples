import { Queue, Worker, QueueEvents } from 'glide-mq';
import type { Job } from 'glide-mq';

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

const connection = {
  addresses: [{ host: 'localhost', port: 6379 }],
  clusterMode: false,
};

// ---------------------------------------------------------------------------
// 1. Queue with Dead-Letter Queue (DLQ)
// ---------------------------------------------------------------------------
// When a job exhausts all retry attempts it is automatically moved to the DLQ
// instead of being silently discarded.

const emailQueue = new Queue('emails', {
  connection,
  deadLetterQueue: { name: 'email-dlq' },
});

const emailDlq = new Queue('email-dlq', { connection });

// ---------------------------------------------------------------------------
// 2. Simulated email sender
// ---------------------------------------------------------------------------
// Mimics network latency and random transient failures so we can exercise
// the retry and DLQ paths without a real SMTP server.

interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  type: 'transactional' | 'marketing';
}

async function simulateSend(email: EmailPayload): Promise<void> {
  // Simulate network latency (100-500 ms)
  const latency = 100 + Math.random() * 400;
  await new Promise((r) => setTimeout(r, latency));

  // ~30 % chance of a transient failure
  if (Math.random() < 0.3) {
    throw new Error(`SMTP timeout sending to ${email.to}`);
  }
}

// ---------------------------------------------------------------------------
// 3. Email Worker -- processes the "emails" queue
// ---------------------------------------------------------------------------
// - Rate-limited to 10 emails/sec via the limiter option.
// - Each job goes through validation -> render -> send stages and reports
//   progress along the way.

const emailWorker = new Worker(
  'emails',
  async (job: Job<EmailPayload>) => {
    const { to, subject, type } = job.data;
    console.log(`[worker] Processing ${type} email to ${to} — "${subject}" (attempt ${job.attemptsMade + 1})`);

    // Stage 1 — Validate recipient
    await job.updateProgress(10);
    await job.log('Validating recipient address');
    await new Promise((r) => setTimeout(r, 50));

    // Stage 2 — Render template
    await job.updateProgress(40);
    await job.log(`Rendering ${type} template`);
    await new Promise((r) => setTimeout(r, 100));

    // Stage 3 — Send via (simulated) SMTP
    await job.updateProgress(70);
    await job.log('Sending via SMTP gateway');
    await simulateSend(job.data);

    // Done
    await job.updateProgress(100);
    await job.log('Delivery confirmed');

    return { delivered: true, to, timestamp: new Date().toISOString() };
  },
  {
    connection,
    concurrency: 5,
    // Rate limit: at most 10 jobs per 1 000 ms
    limiter: { max: 10, duration: 1000 },
  },
);

// ---------------------------------------------------------------------------
// 4. DLQ Worker -- handles permanently failed emails
// ---------------------------------------------------------------------------
// In a real system you might alert an operator, write to a log store, or
// enqueue a notification to the original sender.

const dlqWorker = new Worker(
  'email-dlq',
  async (job: Job) => {
    console.log(
      `[dlq] Permanently failed email — id: ${job.id}, to: ${job.data?.to ?? 'unknown'}, ` +
      `subject: "${job.data?.subject ?? ''}"`,
    );
    await job.log('Logged to dead-letter store for manual review');
    return { logged: true };
  },
  { connection },
);

// ---------------------------------------------------------------------------
// 5. Worker events
// ---------------------------------------------------------------------------

emailWorker.on('completed', (job) =>
  console.log(`[worker] Job ${job.id} completed — delivered to ${job.data.to}`),
);

emailWorker.on('failed', (job, err) =>
  console.error(`[worker] Job ${job.id} failed (attempt ${job.attemptsMade}): ${err.message}`),
);

dlqWorker.on('completed', (job) =>
  console.log(`[dlq] Job ${job.id} processed`),
);

// ---------------------------------------------------------------------------
// 6. Real-time monitoring with QueueEvents
// ---------------------------------------------------------------------------

const emailEvents = new QueueEvents('emails', { connection });

emailEvents.on('added', ({ jobId }) =>
  console.log(`[events] Email job ${jobId} added to queue`),
);

emailEvents.on('completed', ({ jobId }) =>
  console.log(`[events] Email job ${jobId} delivered successfully`),
);

emailEvents.on('failed', ({ jobId, failedReason }) =>
  console.log(`[events] Email job ${jobId} failed — ${failedReason}`),
);

emailEvents.on('progress', ({ jobId, data }) =>
  console.log(`[events] Email job ${jobId} progress: ${data}%`),
);

// ---------------------------------------------------------------------------
// 7. Produce sample email jobs
// ---------------------------------------------------------------------------

// Transactional emails — high priority (10)
const transactionalEmails: { name: string; data: EmailPayload }[] = [
  {
    name: 'password-reset',
    data: { to: 'alice@example.com', subject: 'Reset your password', body: 'Click here to reset...', type: 'transactional' },
  },
  {
    name: 'order-receipt',
    data: { to: 'bob@example.com', subject: 'Your receipt for order #1042', body: 'Thank you for your purchase...', type: 'transactional' },
  },
  {
    name: 'account-verification',
    data: { to: 'carol@example.com', subject: 'Verify your email', body: 'Please confirm your address...', type: 'transactional' },
  },
];

for (const email of transactionalEmails) {
  await emailQueue.add(email.name, email.data, {
    priority: 10,
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
  });
}
console.log(`Queued ${transactionalEmails.length} transactional emails (priority 10)`);

// Marketing emails — low priority (0)
const marketingEmails: { name: string; data: EmailPayload }[] = [
  {
    name: 'weekly-newsletter',
    data: { to: 'dave@example.com', subject: 'This week in tech', body: 'Top stories...', type: 'marketing' },
  },
  {
    name: 'promo-offer',
    data: { to: 'eve@example.com', subject: '50% off — today only!', body: 'Limited time offer...', type: 'marketing' },
  },
  {
    name: 'weekly-newsletter',
    data: { to: 'frank@example.com', subject: 'This week in tech', body: 'Top stories...', type: 'marketing' },
  },
  {
    name: 'promo-offer',
    data: { to: 'grace@example.com', subject: 'Free trial extended', body: 'We extended your trial...', type: 'marketing' },
  },
  {
    name: 'weekly-newsletter',
    data: { to: 'hank@example.com', subject: 'This week in tech', body: 'Top stories...', type: 'marketing' },
  },
];

for (const email of marketingEmails) {
  await emailQueue.add(email.name, email.data, {
    priority: 0,
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
  });
}
console.log(`Queued ${marketingEmails.length} marketing emails (priority 0)`);

// ---------------------------------------------------------------------------
// 8. Graceful shutdown
// ---------------------------------------------------------------------------

console.log('Running... Press Ctrl+C to stop.');

process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await emailWorker.close();
  await dlqWorker.close();
  await emailEvents.close();
  await emailQueue.close();
  await emailDlq.close();
  console.log('All resources closed. Goodbye.');
  process.exit(0);
});
