import { createProxyServer } from 'glide-mq/proxy';
import { Worker } from 'glide-mq';
import type { Job } from 'glide-mq';
import { setTimeout } from 'timers/promises';

const connection = { addresses: [{ host: 'localhost', port: 6379 }] };
const PORT = 3456;

type SseEvent = {
  data: unknown;
  event: string;
  id?: string;
};

async function readFirstSseEvent(path: string, timeoutMs = 5_000): Promise<SseEvent> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`http://localhost:${PORT}${path}`, {
      headers: { Accept: 'text/event-stream' },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`SSE request failed: ${res.status}`);
    }
    if (!res.body) {
      throw new Error(`SSE response for ${path} has no body`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent = 'message';
    let currentId: string | undefined;
    let dataLines: string[] = [];

    const flush = (): SseEvent | undefined => {
      if (dataLines.length === 0) return undefined;
      const raw = dataLines.join('\n');
      let data: unknown = raw;
      try {
        data = JSON.parse(raw);
      } catch {
        // keep raw text for non-JSON payloads
      }
      return { data, event: currentEvent, id: currentId };
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const chunk = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        for (const line of chunk.split(/\r?\n/)) {
          if (line === '' || line.startsWith(':')) continue;
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim();
            continue;
          }
          if (line.startsWith('id:')) {
            currentId = line.slice(3).trim();
            continue;
          }
          if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trimStart());
          }
        }

        const event = flush();
        if (event) {
          await reader.cancel().catch(() => undefined);
          return event;
        }

        currentEvent = 'message';
        currentId = undefined;
        dataLines = [];
        boundary = buffer.indexOf('\n\n');
      }
    }

    throw new Error(`No SSE event received from ${path}`);
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error(`Timed out waiting for SSE event from ${path}`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
    controller.abort();
  }
}

// --- 1. Start the HTTP proxy ---
// createProxyServer returns an Express app that maps HTTP requests to queue ops.
// Any language that can make HTTP calls can enqueue jobs, read usage summaries,
// subscribe to queue events, and publish/consume broadcasts.
// NOTE: Add authentication middleware (API key, JWT) before production use.

const proxy = createProxyServer({
  connection,
  queues: ['emails', 'orders', 'notifications'], // optional allowlist
});

const server = await new Promise<ReturnType<typeof proxy.app.listen>>((resolve) => {
  const s = proxy.app.listen(PORT, () => {
    console.log(`HTTP proxy listening on http://localhost:${PORT}`);
    console.log('Endpoints:');
    console.log('  POST   /queues/:name/jobs        - add a job');
    console.log('  POST   /queues/:name/jobs/bulk   - add jobs in bulk');
    console.log('  GET    /queues/:name/events      - queue lifecycle SSE');
    console.log('  GET    /usage/summary            - rolling usage summary');
    console.log('  POST   /broadcast/:name          - publish a broadcast message');
    console.log('  GET    /broadcast/:name/events   - durable broadcast SSE');
    console.log('  GET    /health                   - health check\n');
    resolve(s);
  });
});

// --- 2. Workers process jobs as usual ---
// The proxy only enqueues - workers are separate Node.js processes.

const emailWorker = new Worker('emails', async (job: Job) => {
  console.log(`[email] Sending to ${job.data.to}: ${job.data.subject}`);
  await job.reportUsage({
    model: 'demo-email-model',
    provider: 'example',
    tokens: { input: 120, output: 45 },
    costs: { total: 0.0012 },
    costUnit: 'usd',
  });
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

const emailQueueEventPromise = readFirstSseEvent('/queues/emails/events');

// Add a single job
const emailResult = await httpPost('/queues/emails/jobs', {
  name: 'welcome',
  data: { to: 'alice@example.com', subject: 'Welcome!' },
});
console.log('POST /queues/emails/jobs:', emailResult);
console.log('GET /queues/emails/events:', await emailQueueEventPromise);

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

const usageSummary = await httpGet('/usage/summary?queues=emails&windowMs=60000');
console.log('\nGET /usage/summary?queues=emails&windowMs=60000:', usageSummary);

const broadcastEventPromise = readFirstSseEvent(
  '/broadcast/notifications/events?subscription=http-proxy-demo&subjects=orders.*',
);
const broadcastPublish = await httpPost('/broadcast/notifications', {
  subject: 'orders.created',
  data: { orderId: 'ORD-900', source: 'http-proxy-example' },
});
console.log('POST /broadcast/notifications:', broadcastPublish);
console.log(
  'GET /broadcast/notifications/events?subscription=http-proxy-demo&subjects=orders.*:',
  await broadcastEventPromise,
);

// Query job counts
const emailCounts = await httpGet('/queues/emails/counts');
console.log('\nGET /queues/emails/counts:', emailCounts);

const orderCounts = await httpGet('/queues/orders/counts');
console.log('GET /queues/orders/counts:', orderCounts);

// Health check
const health = await httpGet('/health');
console.log('GET /health:', health);

// Broadcast channel not in allowlist
const forbidden = await fetch(`http://localhost:${PORT}/broadcast/secret`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ subject: 'hack', data: {} }),
});
console.log(`\nPOST /broadcast/secret: ${forbidden.status}`, await forbidden.json());

// --- Shutdown ---
await new Promise<void>((resolve) => server.close(() => resolve()));
await emailWorker.close();
await orderWorker.close();
await proxy.close();
console.log('\nDone.');
