import Hapi from '@hapi/hapi';
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
emailWorker.on('error', (err) => console.error('Email worker error:', err));
orderWorker.on('error', (err) => console.error('Order worker error:', err));

// Queue registry helper
function getQueue(name: string): Queue | null {
  if (name === 'emails') return emailQueue;
  if (name === 'orders') return orderQueue;
  return null;
}

// Hapi server
const server = Hapi.server({ port: 3000, host: 'localhost' });

// Add a job
server.route({
  method: 'POST',
  path: '/api/queues/{name}/jobs',
  handler: async (request, h) => {
    const queue = getQueue(request.params.name);
    if (!queue) return h.response({ error: 'Queue not found' }).code(404);

    const { name, data, opts } = request.payload as any;
    if (!name || typeof name !== 'string') {
      return h.response({ error: 'Validation failed', details: ['name is required'] }).code(400);
    }

    const job = await queue.add(name, data ?? {}, opts);
    return h.response({ id: job?.id, name: job?.name, data: job?.data }).code(201);
  },
});

// List jobs
server.route({
  method: 'GET',
  path: '/api/queues/{name}/jobs',
  handler: async (request, h) => {
    const queue = getQueue(request.params.name);
    if (!queue) return h.response({ error: 'Queue not found' }).code(404);

    const query = request.query as Record<string, string>;
    const type = query.type ?? 'waiting';
    const start = Number(query.start ?? 0);
    const end = Math.min(Number(query.end ?? 99), 99);
    const jobs = await queue.getJobs(type as any, start, end);
    return h.response(jobs.map((j) => ({ id: j.id, name: j.name, data: j.data })));
  },
});

// Get single job
server.route({
  method: 'GET',
  path: '/api/queues/{name}/jobs/{id}',
  handler: async (request, h) => {
    const queue = getQueue(request.params.name);
    if (!queue) return h.response({ error: 'Queue not found' }).code(404);

    const job = await queue.getJob(request.params.id);
    if (!job) return h.response({ error: 'Job not found' }).code(404);

    return h.response({ id: job.id, name: job.name, data: job.data });
  },
});

// Job counts
server.route({
  method: 'GET',
  path: '/api/queues/{name}/counts',
  handler: async (request, h) => {
    const queue = getQueue(request.params.name);
    if (!queue) return h.response({ error: 'Queue not found' }).code(404);

    return h.response(await queue.getJobCounts());
  },
});

// Pause queue
server.route({
  method: 'POST',
  path: '/api/queues/{name}/pause',
  options: { payload: { failAction: 'ignore' as const } },
  handler: async (request, h) => {
    const queue = getQueue(request.params.name);
    if (!queue) return h.response({ error: 'Queue not found' }).code(404);

    await queue.pause();
    return h.response().code(204);
  },
});

// Resume queue
server.route({
  method: 'POST',
  path: '/api/queues/{name}/resume',
  options: { payload: { failAction: 'ignore' as const } },
  handler: async (request, h) => {
    const queue = getQueue(request.params.name);
    if (!queue) return h.response({ error: 'Queue not found' }).code(404);

    await queue.resume();
    return h.response().code(204);
  },
});

// Convenience routes
server.route({
  method: 'POST',
  path: '/send-email',
  handler: async (request, h) => {
    const { to, subject, body } = request.payload as any;
    const job = await emailQueue.add('send', { to, subject, body });
    return h.response({ jobId: job?.id ?? null });
  },
});

server.route({
  method: 'POST',
  path: '/place-order',
  handler: async (request, h) => {
    const { items, total } = request.payload as any;
    const job = await orderQueue.add('process', { orderId: `ORD-${Date.now()}`, items, total });
    return h.response({ jobId: job?.id ?? null });
  },
});

// Start server
await server.start();
console.log('Hapi server running at', server.info.uri);
console.log('Queue API at http://localhost:3000/api/queues');

// Graceful shutdown
process.on('SIGTERM', async () => {
  await server.stop();
  await Promise.all([emailQueue.close(), orderQueue.close(), emailWorker.close(), orderWorker.close()]);
  process.exit(0);
});
