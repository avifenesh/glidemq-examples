import { Queue, Worker } from 'glide-mq';
import type { Job } from 'glide-mq';
import { setTimeout } from 'timers/promises';

const connection = { addresses: [{ host: 'localhost', port: 6379 }] };

// moveToDelayed(timestamp, nextStep) turns a job into a resumable state machine.
// The job suspends itself, is re-queued at the given timestamp, and resumes at
// the specified step - without using external cron or storing state elsewhere.

// --- 1. Multi-step email campaign ---
// Each email in a drip campaign sends, then schedules the next send.

type CampaignStep = 'welcome' | 'follow-up' | 'final';

type CampaignData = {
  userId: string;
  step: CampaignStep;
  email: string;
};

const campaignQueue = new Queue<CampaignData>('campaign', { connection });

const campaignWorker = new Worker<CampaignData>('campaign', async (job: Job<CampaignData>) => {
  const { userId, step, email } = job.data;

  switch (step) {
    case 'welcome':
      console.log(`[campaign] ${userId}: send welcome email to ${email}`);
      // Schedule the follow-up in 2 seconds (would be 2 days in production)
      await job.moveToDelayed(Date.now() + 2000, 'follow-up');
      // ^^ throws DelayedError - execution stops here
      return;
    case 'follow-up':
      console.log(`[campaign] ${userId}: send follow-up email to ${email}`);
      await job.moveToDelayed(Date.now() + 2000, 'final');
      return;
    case 'final':
      console.log(`[campaign] ${userId}: send final offer email to ${email}`);
      return { userId, completedAt: new Date().toISOString() };
    default:
      throw new Error(`Unknown step: ${step}`);
  }
}, { connection, concurrency: 3, promotionInterval: 200 });

campaignWorker.on('completed', (job, result) => {
  console.log(`[campaign] DONE for ${result.userId} at ${result.completedAt}`);
});
campaignWorker.on('error', (err) => console.error('[campaign] Worker error:', err));

// --- 2. Order processing state machine ---
// Order progresses through payment -> fulfillment -> shipping with delays between.

type OrderStep = 'payment' | 'fulfillment' | 'shipping';

type OrderData = {
  orderId: string;
  step: OrderStep;
  amount: number;
};

const orderQueue = new Queue<OrderData>('orders', { connection });

const orderWorker = new Worker<OrderData>('orders', async (job: Job<OrderData>) => {
  const { orderId, step, amount } = job.data;

  switch (step) {
    case 'payment':
      console.log(`[orders] ${orderId}: processing payment $${amount}`);
      await setTimeout(50); // simulate payment gateway
      // Move to fulfillment after a short delay
      await job.moveToDelayed(Date.now() + 1000, 'fulfillment');
      return;
    case 'fulfillment':
      console.log(`[orders] ${orderId}: fulfilling order`);
      await setTimeout(50);
      await job.moveToDelayed(Date.now() + 1000, 'shipping');
      return;
    case 'shipping':
      console.log(`[orders] ${orderId}: dispatching shipment`);
      await setTimeout(30);
      return { orderId, status: 'shipped', timestamp: Date.now() };
    default:
      throw new Error(`Unknown step: ${step}`);
  }
}, { connection, concurrency: 2, promotionInterval: 200 });

orderWorker.on('completed', (job, result) => {
  console.log(`[orders] Shipped: ${result.orderId}`);
});
orderWorker.on('error', (err) => console.error('[orders] Worker error:', err));

// --- Enqueue initial jobs ---

await campaignQueue.add('drip', { userId: 'u-001', step: 'welcome', email: 'alice@example.com' });
await campaignQueue.add('drip', { userId: 'u-002', step: 'welcome', email: 'bob@example.com' });
console.log('Added 2 campaign jobs (welcome → follow-up → final, 2s apart each)\n');

await orderQueue.add('process', { orderId: 'ORD-100', step: 'payment', amount: 99.99 });
await orderQueue.add('process', { orderId: 'ORD-101', step: 'payment', amount: 24.50 });
console.log('Added 2 order jobs (payment → fulfillment → shipping, 1s apart each)\n');

// Wait for all steps to complete (campaigns: 4s, orders: 2s)
await setTimeout(5500);

// --- Shutdown ---
await Promise.all([
  campaignWorker.close(),
  orderWorker.close(),
  campaignQueue.close(),
  orderQueue.close(),
]);
console.log('\nDone.');
