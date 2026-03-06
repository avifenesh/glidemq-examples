import { Queue, Worker, QueueEvents } from 'glide-mq';
import type { Job } from 'glide-mq';

const connection = {
  addresses: [{ host: 'localhost', port: 6379 }],
  clusterMode: false,
};

// --- 1. Webhook Queue with Dead Letter Queue ---

const webhookQueue = new Queue('webhooks', {
  connection,
  deadLetterQueue: { name: 'webhook-dlq' },
});

// --- 2. Simulated HTTP POST ---

// Simulates sending an HTTP POST to a webhook endpoint.
// Randomly fails ~30% of the time to exercise retry/backoff logic.
async function simulateHttpPost(url: string, payload: unknown): Promise<{ status: number }> {
  const latency = 50 + Math.random() * 200;
  await new Promise((resolve) => setTimeout(resolve, latency));

  if (Math.random() < 0.3) {
    const code = Math.random() < 0.5 ? 500 : 503;
    throw new Error(`HTTP ${code} from ${url}`);
  }

  return { status: 200 };
}

// --- 3. Webhook Delivery Worker ---

const worker = new Worker('webhooks', async (job: Job) => {
  const { endpoint, event, payload, webhookId } = job.data;

  console.log(`[deliver] ${job.id} | ${event} -> ${endpoint} (attempt ${job.attemptsMade + 1}/8)`);

  const response = await simulateHttpPost(endpoint, {
    id: webhookId,
    type: event,
    data: payload,
    timestamp: new Date().toISOString(),
  });

  console.log(`[deliver] ${job.id} | ${event} -> ${endpoint} | HTTP ${response.status}`);

  return { status: response.status, deliveredAt: new Date().toISOString() };
}, {
  connection,
  concurrency: 10,
});

worker.on('completed', (job) => {
  console.log(`[ok]     ${job.id} | delivered successfully`);
});

worker.on('failed', (job, err) => {
  const remaining = 8 - (job.attemptsMade ?? 0);
  if (remaining > 0) {
    console.warn(`[retry]  ${job.id} | ${err.message} | ${remaining} attempts left`);
  } else {
    console.error(`[dead]   ${job.id} | exhausted all attempts, moving to DLQ`);
  }
});

// --- 4. Dead Letter Queue Worker ---

const dlqWorker = new Worker('webhook-dlq', async (job: Job) => {
  console.error(`[dlq] Permanently undeliverable webhook:`);
  console.error(`  Job ID:   ${job.id}`);
  console.error(`  Event:    ${job.data.event}`);
  console.error(`  Endpoint: ${job.data.endpoint}`);
  console.error(`  Payload:  ${JSON.stringify(job.data.payload)}`);
  // In production: persist to a database, alert on-call, or enqueue for manual review.
}, { connection });

// --- 5. Real-time Delivery Tracking ---

const events = new QueueEvents('webhooks', { connection });

events.on('added', ({ jobId }) => {
  console.log(`[event]  ${jobId} | queued for delivery`);
});

events.on('completed', ({ jobId, returnvalue }) => {
  console.log(`[event]  ${jobId} | delivery confirmed`);
});

events.on('failed', ({ jobId, failedReason }) => {
  console.log(`[event]  ${jobId} | delivery attempt failed: ${failedReason}`);
});

// --- 6. Enqueue Example Webhook Events ---

// Webhook endpoint registry (simulated)
const endpoints = [
  'https://partner-a.example.com/webhooks',
  'https://partner-b.example.com/hooks/receive',
  'https://internal.example.com/events',
];

// Example event payloads
const webhookEvents = [
  {
    event: 'order.created',
    payload: {
      orderId: 'ord_8f3k29d',
      customer: { id: 'cust_12x', email: 'alice@example.com' },
      items: [
        { sku: 'WIDGET-01', quantity: 2, unitPrice: 29.99 },
        { sku: 'GADGET-05', quantity: 1, unitPrice: 49.95 },
      ],
      total: 109.93,
      currency: 'USD',
    },
  },
  {
    event: 'payment.completed',
    payload: {
      paymentId: 'pay_a7m42nq',
      orderId: 'ord_8f3k29d',
      amount: 109.93,
      currency: 'USD',
      method: 'card',
      last4: '4242',
    },
  },
  {
    event: 'user.registered',
    payload: {
      userId: 'usr_9xp31w',
      email: 'bob@example.com',
      plan: 'pro',
      registeredAt: '2026-03-06T10:30:00Z',
    },
  },
];

// Fan out each event to every registered endpoint
for (const { event, payload } of webhookEvents) {
  for (const endpoint of endpoints) {
    const eventId = `${event}-${payload[Object.keys(payload)[0] as keyof typeof payload]}-${endpoint}`;

    await webhookQueue.add(event, {
      endpoint,
      event,
      payload,
      webhookId: crypto.randomUUID(),
    }, {
      // Exponential backoff with jitter for transient failures
      attempts: 8,
      backoff: { type: 'exponential', delay: 1000, jitter: 500 },

      // Rate limit per endpoint: max 5 deliveries per 10 seconds
      ordering: {
        key: endpoint,
        rateLimit: { max: 5, duration: 10000 },
      },

      // Prevent double-delivery of the same event to the same endpoint (1-hour TTL)
      deduplication: {
        id: eventId,
        ttl: 3600000,
      },
    });
  }
}

console.log(`Enqueued ${webhookEvents.length * endpoints.length} webhook deliveries across ${endpoints.length} endpoints.`);

// --- 7. Graceful Shutdown ---

console.log('Running... Press Ctrl+C to stop.');

process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await worker.close();
  await dlqWorker.close();
  await events.close();
  await webhookQueue.close();
  process.exit(0);
});
