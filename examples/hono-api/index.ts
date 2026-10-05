import { Hono } from 'hono';
import { bearerAuth } from 'hono/bearer-auth';
import { serve } from '@hono/node-server';
import { glideMQ, glideMQApi, QueueRegistryImpl } from '@glidemq/hono';
import type { GlideMQEnv } from '@glidemq/hono';
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

// Create registry for graceful shutdown access
const registry = new QueueRegistryImpl({
  connection,
  queues: {
    emails: { processor: processEmail, concurrency: 5 },
    orders: { processor: processOrder, concurrency: 3 },
  },
});

const app = new Hono<GlideMQEnv>();
const apiToken = process.env.QUEUE_API_TOKEN;
if (!apiToken) throw new Error('Set QUEUE_API_TOKEN before starting the API');

app.use('*', bearerAuth({ token: apiToken }));

// Mount middleware - injects registry into c.var.glideMQ
app.use(glideMQ(registry));

// Mount queue HTTP API + SSE
app.route('/api/queues', glideMQApi({
  authorize: (c) => c.req.header('Authorization') === `Bearer ${apiToken}`,
}));

// Custom route using the queue directly
app.post('/send-email', async (c) => {
  const { to, subject, body } = await c.req.json();
  const { queue } = c.var.glideMQ.get('emails');
  const job = await queue.add('send', { to, subject, body });
  return c.json({ jobId: job?.id ?? null });
});

app.post('/place-order', async (c) => {
  const { items, total } = await c.req.json();
  const { queue } = c.var.glideMQ.get('orders');
  const job = await queue.add('process', { orderId: `ORD-${Date.now()}`, items, total });
  return c.json({ jobId: job?.id ?? null });
});

// Start server
serve({ fetch: app.fetch, port: 3000 }, () => {
  console.log('Hono server running at http://localhost:3000');
  console.log('Queue API at http://localhost:3000/api/queues');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await registry.closeAll();
  process.exit(0);
});
