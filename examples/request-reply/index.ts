import { Queue, Worker } from 'glide-mq';
import type { Job } from 'glide-mq';
import { setTimeout } from 'timers/promises';

const connection = { addresses: [{ host: 'localhost', port: 6379 }] };

// --- 1. Worker that processes the request and returns a result ---

const rpcQueue = new Queue('rpc', { connection });

const worker = new Worker('rpc', async (job: Job) => {
  console.log(`[worker] Processing ${job.name}: ${JSON.stringify(job.data)}`);
  await setTimeout(50); // simulate work

  if (job.name === 'add') {
    return { result: job.data.a + job.data.b };
  }
  if (job.name === 'greet') {
    return { message: `Hello, ${job.data.name}!` };
  }
  throw new Error(`Unknown operation: ${job.name}`);
}, { connection, concurrency: 5 });

worker.on('error', (err) => console.error('[worker] Error:', err));

// --- 2. addAndWait: enqueue + block until result is available ---
// This is synchronous from the caller's perspective - no polling needed.

console.log('Sending RPC: add(3, 4)');
const addResult = await rpcQueue.addAndWait('add', { a: 3, b: 4 }, { timeout: 5000 });
console.log('Result:', addResult); // { result: 7 }

console.log('\nSending RPC: greet("world")');
const greetResult = await rpcQueue.addAndWait('greet', { name: 'world' }, { timeout: 5000 });
console.log('Result:', greetResult); // { message: "Hello, world!" }

// --- 3. Concurrent RPC calls ---

console.log('\nSending 5 concurrent RPC calls...');
const results = await Promise.all([
  rpcQueue.addAndWait('add', { a: 1, b: 2 }, { timeout: 5000 }),
  rpcQueue.addAndWait('add', { a: 10, b: 20 }, { timeout: 5000 }),
  rpcQueue.addAndWait('add', { a: 100, b: 200 }, { timeout: 5000 }),
  rpcQueue.addAndWait('greet', { name: 'Alice' }, { timeout: 5000 }),
  rpcQueue.addAndWait('greet', { name: 'Bob' }, { timeout: 5000 }),
]);

results.forEach((r, i) => console.log(`  [${i}]`, r));

// --- Shutdown ---
await worker.close();
await rpcQueue.close();
console.log('\nDone.');
process.exit(0);
