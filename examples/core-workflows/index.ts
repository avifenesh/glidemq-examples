import { Queue, Worker, FlowProducer, chain, group } from 'glide-mq';
import type { Job } from 'glide-mq';
import { setTimeout } from 'timers/promises';

const connection = {
  addresses: [{ host: 'localhost', port: 6379 }],
  clusterMode: false,
};

// Queues
const orders = new Queue('orders', { connection });
const payments = new Queue('payments', { connection });
const shipping = new Queue('shipping', { connection });
const notifications = new Queue('notifications', { connection });
const analytics = new Queue('analytics', { connection });

// Workers
const orderWorker = new Worker('orders', async (job: Job) => {
  console.log(`Processing order: ${job.data.orderId}`);
  await setTimeout(500);
  return { orderId: job.data.orderId, status: 'processed' };
}, { connection, concurrency: 5 });

const paymentWorker = new Worker('payments', async (job: Job) => {
  console.log(`Processing payment: $${job.data.amount}`);
  await setTimeout(300);
  return { transactionId: `TXN-${Date.now()}` };
}, { connection, concurrency: 3 });

const shippingWorker = new Worker('shipping', async (job: Job) => {
  console.log(`Creating shipping label for ${job.data.orderId}`);
  await setTimeout(400);
  return { trackingNumber: `TRACK-${Date.now()}` };
}, { connection, concurrency: 5 });

const notificationWorker = new Worker('notifications', async (job: Job) => {
  console.log(`Sending ${job.data.type} to ${job.data.recipient}`);
  await setTimeout(100);
  return { sent: true };
}, { connection, concurrency: 10 });

const analyticsWorker = new Worker('analytics', async (job: Job) => {
  console.log(`Analytics: ${job.data.event}`);
  await setTimeout(100);
  return { processed: true };
}, { connection, concurrency: 10 });

// --- 1. FlowProducer: Parent-child job tree ---

const flowProducer = new FlowProducer({ connection });

await flowProducer.add({
  name: 'complete-order',
  queueName: 'orders',
  data: { orderId: 'ORD-001', total: 499.99 },
  children: [
    {
      name: 'process-payment',
      queueName: 'payments',
      data: { orderId: 'ORD-001', amount: 499.99 },
      children: [
        { name: 'update-inventory', queueName: 'shipping', data: { orderId: 'ORD-001' } },
      ],
    },
    {
      name: 'send-confirmation',
      queueName: 'notifications',
      data: { type: 'email', recipient: 'customer@example.com', message: 'Order confirmed!' },
    },
  ],
});
console.log('Flow: e-commerce order tree submitted');

await setTimeout(3000);

// --- 2. Chain: sequential pipeline ---

await chain('analytics', [
  { name: 'collect', data: { source: 'api' } },
  { name: 'transform', data: { format: 'json' } },
  { name: 'aggregate', data: { window: '1h' } },
  { name: 'store', data: { destination: 'warehouse' } },
], connection);
console.log('Chain: sequential data pipeline submitted');

await setTimeout(2000);

// --- 3. Group: parallel fan-out ---

await group('notifications', [
  { name: 'email', data: { type: 'email', recipient: 'user@example.com', message: 'New feature!' } },
  { name: 'sms', data: { type: 'sms', recipient: '+1234567890', message: 'New feature!' } },
  { name: 'push', data: { type: 'push', recipient: 'device-token', message: 'New feature!' } },
], connection);
console.log('Group: parallel notification broadcast submitted');

await setTimeout(2000);

// --- Shutdown ---

console.log('Done. Shutting down...');
await Promise.all([
  orderWorker.close(), paymentWorker.close(), shippingWorker.close(),
  notificationWorker.close(), analyticsWorker.close(), flowProducer.close(),
  orders.close(), payments.close(), shipping.close(), notifications.close(), analytics.close(),
]);
process.exit(0);
