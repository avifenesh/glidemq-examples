import { Broadcast, BroadcastWorker } from 'glide-mq';
import type { Job } from 'glide-mq';
import { setTimeout } from 'timers/promises';

const connection = { addresses: [{ host: 'localhost', port: 6379 }] };

// Broadcast delivers each message to ALL subscribers independently.
// Each subscriber has its own consumer group, retry budget, and backpressure.
// This is pub/sub fan-out - unlike Queue (point-to-point) where each job
// is processed by exactly one worker.

// --- 1. Publisher ---

const events = new Broadcast<{ event: string; orderId: string; items: string[] }>(
  'order-events',
  { connection, maxMessages: 1000 }, // retain up to 1000 messages in stream
);

// --- 2. Subscribers (each gets every message) ---

// Inventory service - updates stock levels
const inventory = new BroadcastWorker('order-events', async (job: Job) => {
  console.log(`[inventory] Order ${job.data.orderId}: updating stock for ${job.data.items.length} items`);
  await setTimeout(50);
  return { updated: job.data.items.length };
}, {
  connection,
  subscription: 'inventory-service',
  concurrency: 3,
});

inventory.on('completed', (job, result) => {
  console.log(`[inventory] Done: ${result.updated} items updated`);
});
inventory.on('error', () => {}); // suppress connection noise

// Analytics service - tracks events
const analytics = new BroadcastWorker('order-events', async (job: Job) => {
  console.log(`[analytics] Tracking ${job.data.event} for order ${job.data.orderId}`);
  await setTimeout(30);
  return { tracked: true };
}, {
  connection,
  subscription: 'analytics-service',
  concurrency: 5,
});

analytics.on('completed', () => {
  console.log('[analytics] Event tracked');
});
analytics.on('error', () => {});

// Email service - sends confirmation emails
const email = new BroadcastWorker('order-events', async (job: Job) => {
  console.log(`[email] Sending confirmation for order ${job.data.orderId}`);
  await setTimeout(80);
  return { sent: true };
}, {
  connection,
  subscription: 'email-service',
  concurrency: 2,
});

email.on('completed', () => {
  console.log('[email] Confirmation sent');
});
email.on('error', () => {});

// Wait for all subscribers to be ready before publishing
await Promise.all([
  inventory.waitUntilReady(),
  analytics.waitUntilReady(),
  email.waitUntilReady(),
]);

// --- 3. Publish messages ---

console.log('Publishing 3 order events (each delivered to all 3 subscribers)...\n');

await events.publish({
  event: 'order.placed',
  orderId: 'ORD-001',
  items: ['widget-a', 'widget-b'],
});

await events.publish({
  event: 'order.placed',
  orderId: 'ORD-002',
  items: ['gadget-x'],
});

await events.publish({
  event: 'order.placed',
  orderId: 'ORD-003',
  items: ['part-1', 'part-2', 'part-3'],
});

console.log('Published 3 events. Each subscriber processes all 3.\n');

// Wait for all subscribers to process
await setTimeout(2000);

// --- 4. Late subscriber with backfill ---

console.log('\n--- Late subscriber joining with full history backfill ---');

const auditor = new BroadcastWorker('order-events', async (job: Job) => {
  console.log(`[auditor] Replaying ${job.data.event}: order ${job.data.orderId}`);
  return { audited: true };
}, {
  connection,
  subscription: 'audit-service',
  startFrom: '0-0', // replay all retained messages
  concurrency: 5,
});

auditor.on('error', () => {});

await setTimeout(1500);

// --- Shutdown ---
await Promise.all([
  inventory.close(),
  analytics.close(),
  email.close(),
  auditor.close(),
  events.close(),
]);
console.log('\nDone.');
