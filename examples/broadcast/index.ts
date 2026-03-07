import { Broadcast, BroadcastWorker } from 'glide-mq';
import type { Job } from 'glide-mq';

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

const connection = {
  addresses: [{ host: 'localhost', port: 6379 }],
  clusterMode: false,
};

// ---------------------------------------------------------------------------
// 1. Publisher -- fan-out event bus for order events
// ---------------------------------------------------------------------------

const events = new Broadcast('order-events', { connection });

// ---------------------------------------------------------------------------
// 2. Subscribers -- each gets every message independently
// ---------------------------------------------------------------------------
// Each BroadcastWorker creates its own consumer group (named by `subscription`).
// All subscribers receive every published message.

// Inventory service -- updates stock counts
const inventory = new BroadcastWorker('order-events', async (job: Job) => {
  console.log(`[inventory] ${job.name}: updating stock for order ${job.data.orderId}`);
  return { updated: true };
}, {
  connection,
  subscription: 'inventory-service',
  concurrency: 3,
});

// Analytics service -- records metrics
const analytics = new BroadcastWorker('order-events', async (job: Job) => {
  console.log(`[analytics] ${job.name}: recording event for order ${job.data.orderId}`);
  return { recorded: true };
}, {
  connection,
  subscription: 'analytics-service',
  concurrency: 2,
});

// Notification service -- sends customer emails
const notifications = new BroadcastWorker('order-events', async (job: Job) => {
  console.log(`[notifications] ${job.name}: emailing customer ${job.data.customer} about order ${job.data.orderId}`);
  return { notified: true };
}, {
  connection,
  subscription: 'notification-service',
  concurrency: 2,
});

// ---------------------------------------------------------------------------
// 3. Filtered subscriber -- only receives orders.placed events
// ---------------------------------------------------------------------------
// The `subjects` option filters messages by their subject. Non-matching
// messages are auto-acknowledged and skipped without hitting the processor.

const alerts = new BroadcastWorker('order-events', async (job: Job) => {
  console.log(`[alerts] High-value order alert: ${job.data.orderId} ($${job.data.total})`);
  return { alerted: true };
}, {
  connection,
  subscription: 'alert-service',
  subjects: ['orders.placed'],  // only orders.placed, ignores others
  concurrency: 1,
});

// ---------------------------------------------------------------------------
// 4. Worker events
// ---------------------------------------------------------------------------

inventory.on('completed', (job) =>
  console.log(`[inventory] Job ${job.id} completed`),
);
inventory.on('failed', (job, err) =>
  console.error(`[inventory] Job ${job.id} failed: ${err.message}`),
);

analytics.on('completed', (job) =>
  console.log(`[analytics] Job ${job.id} completed`),
);

notifications.on('completed', (job) =>
  console.log(`[notifications] Job ${job.id} completed`),
);

alerts.on('completed', (job) =>
  console.log(`[alerts] Job ${job.id} completed`),
);

// ---------------------------------------------------------------------------
// 5. Publish order events with different subjects
// ---------------------------------------------------------------------------
// publish(subject, data, opts?) -- subject is a dot-separated routing key.

// orders.placed -- received by ALL subscribers (inventory, analytics,
//   notifications, AND alerts)
await events.publish('orders.placed', {
  orderId: 'ORD-1001',
  customer: 'alice@example.com',
  items: ['widget-a', 'widget-b'],
  total: 149.99,
});
console.log('Published: orders.placed (ORD-1001)');

await events.publish('orders.placed', {
  orderId: 'ORD-1002',
  customer: 'bob@example.com',
  items: ['gadget-x'],
  total: 299.00,
});
console.log('Published: orders.placed (ORD-1002)');

// orders.confirmed -- received by inventory, analytics, notifications
//   but NOT alerts (filtered out)
await events.publish('orders.confirmed', {
  orderId: 'ORD-1001',
  customer: 'alice@example.com',
  confirmedAt: new Date().toISOString(),
});
console.log('Published: orders.confirmed (ORD-1001)');

// orders.shipped -- received by inventory, analytics, notifications
//   but NOT alerts (filtered out)
await events.publish('orders.shipped', {
  orderId: 'ORD-1001',
  customer: 'alice@example.com',
  trackingNumber: 'TRK-98765',
  carrier: 'FedEx',
});
console.log('Published: orders.shipped (ORD-1001)');

await events.publish('orders.shipped', {
  orderId: 'ORD-1002',
  customer: 'bob@example.com',
  trackingNumber: 'TRK-98766',
  carrier: 'UPS',
});
console.log('Published: orders.shipped (ORD-1002)');

// ---------------------------------------------------------------------------
// 6. Graceful shutdown
// ---------------------------------------------------------------------------

console.log('\nRunning... Press Ctrl+C to stop.');

process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await inventory.close();
  await analytics.close();
  await notifications.close();
  await alerts.close();
  await events.close();
  console.log('All resources closed. Goodbye.');
  process.exit(0);
});
