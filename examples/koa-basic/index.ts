import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import { Queue, Worker } from 'glide-mq';
import type { Job } from 'glide-mq';

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
emailWorker.on('error', () => {});
orderWorker.on('error', () => {});

// Koa app
const app = new Koa();
const router = new Router();

app.use(bodyParser());

// Add a job
router.post('/api/queues/:name/jobs', async (ctx) => {
  const { name: queueName } = ctx.params;
  const queue = queueName === 'emails' ? emailQueue : queueName === 'orders' ? orderQueue : null;

  if (!queue) {
    ctx.status = 404;
    ctx.body = { error: 'Queue not found' };
    return;
  }

  const { name, data, opts } = ctx.request.body as any;
  if (!name || typeof name !== 'string') {
    ctx.status = 400;
    ctx.body = { error: 'Validation failed', details: ['name is required'] };
    return;
  }

  const job = await queue.add(name, data ?? {}, opts);
  ctx.status = 201;
  ctx.body = { id: job?.id, name: job?.name, data: job?.data };
});

// Get job counts
router.get('/api/queues/:name/counts', async (ctx) => {
  const { name: queueName } = ctx.params;
  const queue = queueName === 'emails' ? emailQueue : queueName === 'orders' ? orderQueue : null;

  if (!queue) {
    ctx.status = 404;
    ctx.body = { error: 'Queue not found' };
    return;
  }

  ctx.body = await queue.getJobCounts();
});

// List jobs
router.get('/api/queues/:name/jobs', async (ctx) => {
  const { name: queueName } = ctx.params;
  const queue = queueName === 'emails' ? emailQueue : queueName === 'orders' ? orderQueue : null;

  if (!queue) {
    ctx.status = 404;
    ctx.body = { error: 'Queue not found' };
    return;
  }

  const type = (ctx.query.type as string) ?? 'waiting';
  const jobs = await queue.getJobs(type as any);
  ctx.body = jobs.map((j) => ({ id: j.id, name: j.name, data: j.data }));
});

// Get single job
router.get('/api/queues/:name/jobs/:id', async (ctx) => {
  const { name: queueName, id } = ctx.params;
  const queue = queueName === 'emails' ? emailQueue : queueName === 'orders' ? orderQueue : null;

  if (!queue) {
    ctx.status = 404;
    ctx.body = { error: 'Queue not found' };
    return;
  }

  const job = await queue.getJob(id);
  if (!job) {
    ctx.status = 404;
    ctx.body = { error: 'Job not found' };
    return;
  }

  ctx.body = { id: job.id, name: job.name, data: job.data };
});

// Pause / resume
router.post('/api/queues/:name/pause', async (ctx) => {
  const queue = ctx.params.name === 'emails' ? emailQueue : ctx.params.name === 'orders' ? orderQueue : null;
  if (!queue) { ctx.status = 404; ctx.body = { error: 'Queue not found' }; return; }
  await queue.pause();
  ctx.status = 204;
});

router.post('/api/queues/:name/resume', async (ctx) => {
  const queue = ctx.params.name === 'emails' ? emailQueue : ctx.params.name === 'orders' ? orderQueue : null;
  if (!queue) { ctx.status = 404; ctx.body = { error: 'Queue not found' }; return; }
  await queue.resume();
  ctx.status = 204;
});

// Custom convenience routes
router.post('/send-email', async (ctx) => {
  const { to, subject, body } = ctx.request.body as any;
  const job = await emailQueue.add('send', { to, subject, body });
  ctx.body = { jobId: job?.id ?? null };
});

router.post('/place-order', async (ctx) => {
  const { items, total } = ctx.request.body as any;
  const job = await orderQueue.add('process', { orderId: `ORD-${Date.now()}`, items, total });
  ctx.body = { jobId: job?.id ?? null };
});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(3000, () => {
  console.log('Koa server running at http://localhost:3000');
  console.log('Queue API at http://localhost:3000/api/queues');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await Promise.all([emailQueue.close(), orderQueue.close(), emailWorker.close(), orderWorker.close()]);
  process.exit(0);
});
