import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { Queue, Worker } from 'glide-mq';

const connection = { addresses: [{ host: 'localhost', port: 6379 }] };

const emailQueue = new Queue('emails', { connection });

// Worker - processes jobs in background
const worker = new Worker('emails', async (job) => {
  console.log(`Sending email to ${job.data.to}: ${job.data.subject}`);
  // Simulate email sending
  await new Promise(r => setTimeout(r, 500));
  return { sent: true };
}, { connection, concurrency: 5 });

worker.on('completed', (job) => console.log(`Email ${job.id} sent`));
worker.on('failed', (job, err) => console.error(`Email ${job.id} failed:`, err.message));

// Hono app - produces jobs
const app = new Hono();

app.post('/send-email', async (c) => {
  const { to, subject, body } = await c.req.json();
  const job = await emailQueue.add('send', { to, subject, body });
  return c.json({ jobId: job?.id ?? null, status: 'queued' });
});

app.get('/queue-status', async (c) => {
  const counts = await emailQueue.getJobCounts();
  return c.json(counts);
});

serve({ fetch: app.fetch, port: 3000 }, () => {
  console.log('Server running at http://localhost:3000');
});
