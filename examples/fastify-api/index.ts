import Fastify from 'fastify';
import { glideMQPlugin, glideMQRoutes, QueueRegistryImpl } from '@glidemq/fastify';
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

const app = Fastify({ logger: true });

// Register core plugin with pre-built registry
await app.register(glideMQPlugin, registry as any);

// Mount REST API (11 endpoints + SSE)
await app.register(glideMQRoutes, { prefix: '/api/queues' });

// Custom route using the queue directly
app.post('/send-email', async (request, reply) => {
  const { to, subject, body } = request.body as any;
  const { queue } = app.glidemq.get('emails');
  const job = await queue.add('send', { to, subject, body });
  return reply.send({ jobId: job?.id ?? null });
});

app.post('/place-order', async (request, reply) => {
  const { items, total } = request.body as any;
  const { queue } = app.glidemq.get('orders');
  const job = await queue.add('process', { orderId: `ORD-${Date.now()}`, items, total });
  return reply.send({ jobId: job?.id ?? null });
});

// Start server
await app.listen({ port: 3000 });
console.log('Fastify server running at http://localhost:3000');
console.log('Queue API at http://localhost:3000/api/queues');

// Graceful shutdown
process.on('SIGTERM', async () => {
  await app.close(); // triggers onClose hook → registry.closeAll()
  process.exit(0);
});
