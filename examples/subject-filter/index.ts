import { Broadcast, BroadcastWorker } from 'glide-mq';
import type { Job } from 'glide-mq';
import { setTimeout } from 'timers/promises';

const connection = { addresses: [{ host: 'localhost', port: 6379 }] };

// Subject-based filtering lets BroadcastWorker subscribers receive only
// messages matching specific patterns. Non-matching messages are auto-ACKed
// at the stream level (zero wasted HGETALL calls).
//
// Pattern syntax (dot-separated segments):
//   *  matches exactly one segment
//   >  matches one or more trailing segments (must be last token)
//
// Examples:
//   'orders.*'           matches 'orders.placed', not 'orders.us.placed'
//   'orders.>'           matches 'orders.placed', 'orders.us.east.placed'
//   'orders.*.shipped'   matches 'orders.123.shipped'

const events = new Broadcast('store-events', { connection, maxMessages: 500 });

// --- 1. Catch-all subscriber (no filter) ---

const logger = new BroadcastWorker('store-events', async (job: Job) => {
  console.log(`[logger] ${job.name}: ${JSON.stringify(job.data)}`);
  return { logged: true };
}, {
  connection,
  subscription: 'event-logger',
  concurrency: 5,
});
logger.on('error', () => {});

// --- 2. Orders-only subscriber (wildcard) ---

const orderService = new BroadcastWorker('store-events', async (job: Job) => {
  console.log(`[orders] ${job.name}: orderId=${job.data.orderId}`);
  return { processed: true };
}, {
  connection,
  subscription: 'order-service',
  subjects: ['orders.>'],  // matches orders.placed, orders.shipped, orders.refunded
  concurrency: 3,
});
orderService.on('error', () => {});

// --- 3. Payment alerts (specific subjects) ---

const paymentAlerts = new BroadcastWorker('store-events', async (job: Job) => {
  console.log(`[payments] ALERT ${job.name}: $${job.data.amount}`);
  return { alerted: true };
}, {
  connection,
  subscription: 'payment-alerts',
  subjects: ['payments.failed', 'payments.refunded'],  // only failures and refunds
  concurrency: 1,
});
paymentAlerts.on('error', () => {});

// --- 4. Regional inventory (segment wildcard) ---

const usInventory = new BroadcastWorker('store-events', async (job: Job) => {
  console.log(`[us-inventory] ${job.name}: ${job.data.sku}`);
  return { updated: true };
}, {
  connection,
  subscription: 'us-inventory',
  subjects: ['inventory.us.*'],  // matches inventory.us.east, inventory.us.west
  concurrency: 2,
});
usInventory.on('error', () => {});

// Wait for all subscribers to be ready
await Promise.all([
  logger.waitUntilReady(),
  orderService.waitUntilReady(),
  paymentAlerts.waitUntilReady(),
  usInventory.waitUntilReady(),
]);

// --- 5. Publish events with different subjects ---

console.log('Publishing events with various subjects...\n');

// Orders - received by logger + orderService
await events.publish('orders.placed', { orderId: 'ORD-001', amount: 99.99 });
await events.publish('orders.shipped', { orderId: 'ORD-001', carrier: 'FedEx' });

// Payments - received by logger, paymentAlerts gets only failed/refunded
await events.publish('payments.completed', { txId: 'TX-100', amount: 99.99 });
await events.publish('payments.failed', { txId: 'TX-101', amount: 49.99, reason: 'insufficient funds' });
await events.publish('payments.refunded', { txId: 'TX-100', amount: 99.99 });

// Inventory - received by logger, usInventory gets only us.*
await events.publish('inventory.us.east', { sku: 'WIDGET-A', delta: -5 });
await events.publish('inventory.eu.west', { sku: 'WIDGET-B', delta: +10 });
await events.publish('inventory.us.west', { sku: 'WIDGET-C', delta: -2 });

// Users - received by logger only (no subscriber filters match)
await events.publish('users.signup', { userId: 'U-500', email: 'new@example.com' });

console.log('\nWaiting for processing...\n');
await setTimeout(2000);

// --- Summary ---
console.log('\n--- Expected routing ---');
console.log('logger:         ALL 9 events (no filter)');
console.log('order-service:  2 events (orders.placed, orders.shipped)');
console.log('payment-alerts: 2 events (payments.failed, payments.refunded)');
console.log('us-inventory:   2 events (inventory.us.east, inventory.us.west)');

// --- Shutdown ---
await Promise.all([
  logger.close(),
  orderService.close(),
  paymentAlerts.close(),
  usInventory.close(),
  events.close(),
]);
console.log('\nDone.');
