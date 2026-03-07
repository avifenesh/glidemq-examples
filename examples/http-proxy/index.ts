import { createProxyServer } from 'glide-mq/proxy';
import { Worker } from 'glide-mq';
import type { Job } from 'glide-mq';
import { setTimeout } from 'timers/promises';

const connection = { addresses: [{ host: 'localhost', port: 6379 }] };

// --- 1. Start the HTTP proxy ---
// createProxyServer returns an Express app that maps HTTP requests to queue ops.
// Any language that can make HTTP calls can enqueue and query jobs.
// NOTE: Add authentication middleware (API key, JWT) before production use.

const proxy = createProxyServer({
  connection,
  queues: ['emails', 'orders'], // optional allowlist
});

const PORT = 3456;
const server = await new Promise<ReturnType<typeof proxy.app.listen>>((resolve) => {
  const s = proxy.app.listen(PORT, () => {
    console.log(`HTTP proxy listening on http://localhost:${PORT}`);
    console.log('Endpoints:');
    console.log('  POST   /queues/:name/jobs       - add a job');
    console.log('  POST   /queues/:name/jobs/bulk   - add jobs in bulk');
    console.log('  GET    /queues/:name/jobs/:id    - get job by ID');
    console.log('  GET    /queues/:name/counts      - get job counts');
    console.log('  GET    /health                   - health check\n');
    resolve(s);
  });
});

// --- 2. Workers process jobs as usual ---
// The proxy only enqueues - workers are separate Node.js processes.

const emailWorker = new Worker('emails', async (job: Job) => {
  console.log(`[email] Sending to ${job.data.to}: ${job.data.subject}`);
  return { sent: true };
}, { connection, concurrency: 2 });

emailWorker.on('error', (err) => console.error('[email] Error:', err));

const orderWorker = new Worker('orders', async (job: Job) => {
  console.log(`[order] Processing ${job.data.orderId}: $${job.data.amount}`);
  return { processed: true, orderId: job.data.orderId };
}, { connection, concurrency: 2 });

orderWorker.on('error', (err) => console.error('[order] Error:', err));

// --- 3. Demo: enqueue via HTTP (simulating a Python/Go/Ruby client) ---

async function httpPost(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`http://localhost:${PORT}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function httpGet(path: string): Promise<unknown> {
  const res = await fetch(`http://localhost:${PORT}${path}`);
  return res.json();
}

// Add a single job
const emailResult = await httpPost('/queues/emails/jobs', {
  name: 'welcome',
  data: { to: 'alice@example.com', subject: 'Welcome!' },
});
console.log('POST /queues/emails/jobs:', emailResult);

// Add jobs in bulk
const bulkResult = await httpPost('/queues/orders/jobs/bulk', {
  jobs: [
    { name: 'process', data: { orderId: 'ORD-001', amount: 99.99 } },
    { name: 'process', data: { orderId: 'ORD-002', amount: 24.50 } },
    { name: 'process', data: { orderId: 'ORD-003', amount: 150.00 } },
  ],
});
console.log('POST /queues/orders/jobs/bulk:', bulkResult);

// Wait for processing
await setTimeout(500);

// Query job counts
const emailCounts = await httpGet('/queues/emails/counts');
console.log('\nGET /queues/emails/counts:', emailCounts);

const orderCounts = await httpGet('/queues/orders/counts');
console.log('GET /queues/orders/counts:', orderCounts);

// Health check
const health = await httpGet('/health');
console.log('GET /health:', health);

// Queue not in allowlist
const forbidden = await fetch(`http://localhost:${PORT}/queues/secret/jobs`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'hack' }),
});
console.log(`\nPOST /queues/secret/jobs: ${forbidden.status}`, await forbidden.json());

// --- Shutdown ---
await new Promise<void>((resolve) => server.close(() => resolve()));
await emailWorker.close();
await orderWorker.close();
await proxy.close();
console.log('\nDone.');
