import Hapi from '@hapi/hapi';
import { glideMQPlugin } from '@glidemq/hapi';
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

const queues = {
  emails: { processor: processEmail, concurrency: 5 },
  orders: { processor: processOrder, concurrency: 3 },
};

const server = Hapi.server({ port: 3000, host: 'localhost' });

// Register the plugin and mount its HTTP API in a prefixed Hapi realm.
await server.register({
  plugin: glideMQPlugin,
  options: { connection, queues, routes: true },
}, { routes: { prefix: '/api/queues' } });

// Custom route using the queue directly
server.route({
  method: 'POST',
  path: '/send-email',
  handler: async (request, h) => {
    const { to, subject, body } = request.payload as any;
    const { queue } = request.server.glidemq.get('emails');
    const job = await queue.add('send', { to, subject, body });
    return h.response({ jobId: job?.id ?? null });
  },
});

server.route({
  method: 'POST',
  path: '/place-order',
  handler: async (request, h) => {
    const { items, total } = request.payload as any;
    const { queue } = request.server.glidemq.get('orders');
    const job = await queue.add('process', { orderId: `ORD-${Date.now()}`, items, total });
    return h.response({ jobId: job?.id ?? null });
  },
});

// Start server
await server.start();
console.log('Hapi server running at', server.info.uri);
console.log('Queue API at http://localhost:3000/api/queues');

// Graceful shutdown
process.on('SIGTERM', async () => {
  await server.stop(); // triggers onPostStop hook -> registry.closeAll()
  process.exit(0);
});
