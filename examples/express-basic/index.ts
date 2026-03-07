import crypto from 'crypto';
import express from 'express';
import { Queue, Worker } from 'glide-mq';
import type { Job } from 'glide-mq';

const VALID_JOB_TYPES = ['waiting', 'active', 'delayed', 'completed', 'failed'] as const;
type JobType = typeof VALID_JOB_TYPES[number];

const connection = { addresses: [{ host: 'localhost', port: 6379 }] };

// Processor functions
async function processEmail(job: Job) {
  console.log(`Sending email to ${job.data.to}`);
  return { sent: true, to: job.data.to };
}

async function processOrder(job: Job) {
  console.log(`Processing order ${job.data.orderId}`);
  await job.updateProgress(50);
  return { orderId: job.data.orderId, status: 'shipped' };
}

// Create queues and workers
const emailQueue = new Queue('emails', { connection });
const orderQueue = new Queue('orders', { connection });

const emailWorker = new Worker('emails', processEmail, { connection, concurrency: 5 });
const orderWorker = new Worker('orders', processOrder, { connection, concurrency: 3 });

emailWorker.on('completed', (job) => console.log(`Email job ${job.id} done`));
orderWorker.on('completed', (job) => console.log(`Order job ${job.id} done`));
emailWorker.on('error', (err) => console.error('Email worker error:', err));
orderWorker.on('error', (err) => console.error('Order worker error:', err));

// Queue registry helper
function getQueue(name: string): Queue | null {
  if (name === 'emails') return emailQueue;
  if (name === 'orders') return orderQueue;
  return null;
}

// Express app
const app = express();
app.use(express.json());

// Note: auth is omitted intentionally - this is a local dev example.
// Add middleware (e.g. express-jwt) to protect these routes in production.
const router = express.Router();

// Add a job
router.post('/:name/jobs', async (req, res) => {
  const queue = getQueue(req.params.name);
  if (!queue) { res.status(404).json({ error: 'Queue not found' }); return; }

  const { name, data, opts } = req.body;
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'Validation failed', details: ['name is required'] });
    return;
  }

  const job = await queue.add(name, data ?? {}, opts);
  res.status(201).json({ id: job?.id, name: job?.name, data: job?.data });
});

// List jobs (max 100 per page)
router.get('/:name/jobs', async (req, res) => {
  const queue = getQueue(req.params.name);
  if (!queue) { res.status(404).json({ error: 'Queue not found' }); return; }

  const type = (req.query.type as string) ?? 'waiting';
  if (!VALID_JOB_TYPES.includes(type as JobType)) {
    res.status(400).json({ error: 'Validation failed', details: [`type must be one of: ${VALID_JOB_TYPES.join(', ')}`] });
    return;
  }

  const start = Number(req.query.start ?? 0);
  const end = Math.min(Number(req.query.end ?? 99), 99); // cap at 100 jobs
  const jobs = await queue.getJobs(type as JobType, start, end);
  res.json(jobs.map((j) => ({ id: j.id, name: j.name, data: j.data })));
});

// Get single job
router.get('/:name/jobs/:id', async (req, res) => {
  const queue = getQueue(req.params.name);
  if (!queue) { res.status(404).json({ error: 'Queue not found' }); return; }

  const job = await queue.getJob(req.params.id);
  if (!job) { res.status(404).json({ error: 'Job not found' }); return; }

  res.json({ id: job.id, name: job.name, data: job.data });
});

// Job counts
router.get('/:name/counts', async (req, res) => {
  const queue = getQueue(req.params.name);
  if (!queue) { res.status(404).json({ error: 'Queue not found' }); return; }

  res.json(await queue.getJobCounts());
});

// Pause queue
router.post('/:name/pause', async (req, res) => {
  const queue = getQueue(req.params.name);
  if (!queue) { res.status(404).json({ error: 'Queue not found' }); return; }

  await queue.pause();
  res.status(204).send();
});

// Resume queue
router.post('/:name/resume', async (req, res) => {
  const queue = getQueue(req.params.name);
  if (!queue) { res.status(404).json({ error: 'Queue not found' }); return; }

  await queue.resume();
  res.status(204).send();
});

app.use('/api/queues', router);

// Convenience routes
app.post('/send-email', async (req, res) => {
  const { to, subject, body } = req.body;
  const job = await emailQueue.add('send', { to, subject, body });
  res.json({ jobId: job?.id ?? null });
});

app.post('/place-order', async (req, res) => {
  const { items, total } = req.body;
  const job = await orderQueue.add('process', { orderId: `ORD-${crypto.randomUUID()}`, items, total });
  res.json({ jobId: job?.id ?? null });
});

app.listen(3000, () => {
  console.log('Express server running at http://localhost:3000');
  console.log('Queue API at http://localhost:3000/api/queues');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await Promise.all([emailQueue.close(), orderQueue.close(), emailWorker.close(), orderWorker.close()]);
  process.exit(0);
});
