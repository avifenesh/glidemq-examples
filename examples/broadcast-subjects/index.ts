/**
 * Broadcast Subject-Based Filtering Example
 *
 * Demonstrates BroadcastWorker's `subjects` option for routing messages to
 * specific subscribers based on dot-separated subject patterns.
 *
 * Key concepts:
 *   - Subject patterns use glob matching via compileSubjectMatcher internally.
 *   - '*' matches exactly one dot-separated segment.
 *   - '>' matches one or more trailing segments (must be the last token).
 *   - Non-matching messages are auto-ACKed and skipped (the processor is
 *     never called), so there is zero wasted work.
 *   - Without the `subjects` option, all messages are delivered to the
 *     processor (backward compatible with pre-filtering behavior).
 *
 * Requires Valkey/Redis on localhost:6379.
 */

import { Broadcast, BroadcastWorker } from 'glide-mq';
import type { Job } from 'glide-mq';
import { setTimeout } from 'timers/promises';

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

const connection = {
  addresses: [{ host: 'localhost', port: 6379 }],
};

// ---------------------------------------------------------------------------
// 1. Publisher - fan-out event bus for a microservices system
// ---------------------------------------------------------------------------

const events = new Broadcast('service-events', {
  connection,
  maxMessages: 1000,
});

// ---------------------------------------------------------------------------
// 2. Subscribers - each with different subject filters
// ---------------------------------------------------------------------------
// Each BroadcastWorker creates its own consumer group (named by `subscription`).
// The `subjects` option controls which messages reach the processor.

// --- orders-service: subscribes to all order events ---
// Pattern 'orders.*' matches exactly one segment after 'orders.':
//   orders.placed    -> MATCH
//   orders.shipped   -> MATCH
//   orders.delivered  -> MATCH
//   payments.completed -> NO MATCH (different first segment)
const ordersService = new BroadcastWorker('service-events', async (job: Job) => {
  console.log(`  [orders-service]    ${job.name} -> orderId=${job.data.orderId}`);
  return { handled: true };
}, {
  connection,
  subscription: 'orders-service',
  subjects: ['orders.*'],
  concurrency: 3,
});
ordersService.on('error', () => {});

// --- shipping-service: subscribes to shipping-related order events only ---
// Multiple literal patterns - a message matches if it matches ANY pattern.
//   orders.shipped   -> MATCH (first pattern)
//   orders.delivered  -> MATCH (second pattern)
//   orders.placed    -> NO MATCH (neither pattern)
//   payments.completed -> NO MATCH
const shippingService = new BroadcastWorker('service-events', async (job: Job) => {
  console.log(`  [shipping-service]  ${job.name} -> tracking=${job.data.tracking ?? 'n/a'}`);
  return { handled: true };
}, {
  connection,
  subscription: 'shipping-service',
  subjects: ['orders.shipped', 'orders.delivered'],
  concurrency: 2,
});
shippingService.on('error', () => {});

// --- analytics-service: subscribes to everything (catch-all) ---
// No `subjects` option means all messages are delivered, no filtering.
// This is backward compatible - exactly how BroadcastWorker worked before
// subject filtering was added.
const analyticsService = new BroadcastWorker('service-events', async (job: Job) => {
  console.log(`  [analytics-service] ${job.name} -> ${JSON.stringify(job.data)}`);
  return { recorded: true };
}, {
  connection,
  subscription: 'analytics-service',
  concurrency: 5,
  // No `subjects` - receives ALL messages
});
analyticsService.on('error', () => {});

// ---------------------------------------------------------------------------
// 3. Wait for all subscribers to connect and create their consumer groups
// ---------------------------------------------------------------------------

await Promise.all([
  ordersService.waitUntilReady(),
  shippingService.waitUntilReady(),
  analyticsService.waitUntilReady(),
]);

console.log('All subscribers ready.\n');

// ---------------------------------------------------------------------------
// 4. Publish messages with different subjects
// ---------------------------------------------------------------------------
// The first argument to publish() is the subject (stored as the job name).
// BroadcastWorker subject patterns match against this value.

console.log('Publishing events...\n');

await events.publish('orders.placed', {
  orderId: 'ORD-2001',
  customer: 'alice@example.com',
  items: ['widget-a', 'widget-b'],
  total: 149.99,
});
console.log('  Published: orders.placed (ORD-2001)');

await events.publish('orders.shipped', {
  orderId: 'ORD-2001',
  tracking: 'TRK-55501',
  carrier: 'FedEx',
});
console.log('  Published: orders.shipped (ORD-2001)');

await events.publish('orders.delivered', {
  orderId: 'ORD-2001',
  tracking: 'TRK-55501',
  deliveredAt: new Date().toISOString(),
});
console.log('  Published: orders.delivered (ORD-2001)');

await events.publish('payments.completed', {
  txId: 'TX-8001',
  amount: 149.99,
  method: 'credit_card',
});
console.log('  Published: payments.completed (TX-8001)');

// ---------------------------------------------------------------------------
// 5. Wait for processing
// ---------------------------------------------------------------------------

console.log('\nWaiting for processing...\n');
await setTimeout(2000);

// ---------------------------------------------------------------------------
// 6. Expected routing summary
// ---------------------------------------------------------------------------

console.log('\n--- Expected routing ---');
console.log('');
console.log('  orders.placed       -> orders-service, analytics-service');
console.log('  orders.shipped      -> orders-service, shipping-service, analytics-service');
console.log('  orders.delivered    -> orders-service, shipping-service, analytics-service');
console.log('  payments.completed  -> analytics-service only');
console.log('');
console.log('  orders-service:    3 messages  (subjects: [\'orders.*\'])');
console.log('  shipping-service:  2 messages  (subjects: [\'orders.shipped\', \'orders.delivered\'])');
console.log('  analytics-service: 4 messages  (no subjects filter - receives all)');

// ---------------------------------------------------------------------------
// 7. Cleanup
// ---------------------------------------------------------------------------
// gracefulShutdown() from glide-mq works with Queue/Worker. For Broadcast and
// BroadcastWorker, call .close() directly.

console.log('\nShutting down...');
await Promise.all([
  ordersService.close(),
  shippingService.close(),
  analyticsService.close(),
  events.close(),
]);
console.log('Done.');
