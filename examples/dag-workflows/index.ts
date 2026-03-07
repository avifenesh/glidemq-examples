import { Queue, Worker, FlowProducer, dag } from 'glide-mq';
import type { Job, DAGNode } from 'glide-mq';
import { setTimeout } from 'timers/promises';

const connection = { addresses: [{ host: 'localhost', port: 6379 }] };

// DAG (Directed Acyclic Graph) workflows allow arbitrary dependency graphs -
// not just parent-child trees. A node can depend on multiple parents (fan-in),
// and multiple nodes can depend on the same parent (fan-out).
//
// dag() validates the graph (cycle detection), topologically sorts nodes,
// and submits them via FlowProducer.addDAG().

// --- Worker ---

const etlWorker = new Worker('etl', async (job: Job) => {
  console.log(`[etl] ${job.name}: processing`);
  await setTimeout(100 + Math.floor(Math.random() * 100));

  switch (job.name) {
    case 'fetch-users':
      return { source: 'users', rows: 500 };
    case 'fetch-orders':
      return { source: 'orders', rows: 1200 };
    case 'fetch-products':
      return { source: 'products', rows: 300 };
    case 'join':
      return { joined: true };
    case 'enrich':
      return { enriched: true };
    case 'export':
      return { exported: true, destination: 's3://warehouse' };
    default:
      return { processed: true };
  }
}, { connection, concurrency: 5 });

etlWorker.on('completed', (job, result) => {
  console.log(`[etl] DONE ${job.name}:`, result);
});
etlWorker.on('error', (err) => console.error('[etl] Worker error:', err));

// --- Example 1: Diamond dependency pattern ---
//
//   fetch-users   fetch-orders   fetch-products
//        \            /                |
//      join (waits for BOTH)           |
//              \                      /
//            enrich (waits for join + products)
//                 |
//               export

console.log('--- DAG 1: Diamond ETL pipeline ---\n');

const nodes: DAGNode[] = [
  { name: 'fetch-users',    queueName: 'etl', data: { source: 'users-db' } },
  { name: 'fetch-orders',   queueName: 'etl', data: { source: 'orders-db' } },
  { name: 'fetch-products', queueName: 'etl', data: { source: 'products-db' } },
  { name: 'join', queueName: 'etl', data: { type: 'inner-join' },
    deps: ['fetch-users', 'fetch-orders'] },
  { name: 'enrich', queueName: 'etl', data: { type: 'left-join' },
    deps: ['join', 'fetch-products'] },
  { name: 'export', queueName: 'etl', data: { dest: 's3://warehouse' },
    deps: ['enrich'] },
];

const results = await dag(nodes, connection);
console.log(`DAG submitted: ${results.size} nodes`);
for (const [name, job] of results) {
  console.log(`  ${name} -> job ${job.id}`);
}

// Wait for pipeline to complete
await setTimeout(3000);

// --- Example 2: Fan-in merge (3 sources -> 1 merge) ---

console.log('\n--- DAG 2: Fan-in merge ---\n');

const mergeResults = await dag([
  { name: 'source-a', queueName: 'etl', data: { api: 'service-a' } },
  { name: 'source-b', queueName: 'etl', data: { api: 'service-b' } },
  { name: 'source-c', queueName: 'etl', data: { api: 'service-c' } },
  { name: 'merge',    queueName: 'etl', data: { strategy: 'concat' },
    deps: ['source-a', 'source-b', 'source-c'] },
], connection);

console.log(`Fan-in submitted: ${mergeResults.size} nodes\n`);

await setTimeout(2000);

// --- Example 3: Cycle detection ---

console.log('--- DAG 3: Cycle detection ---\n');

try {
  await dag([
    { name: 'a', queueName: 'etl', data: {}, deps: ['c'] },
    { name: 'b', queueName: 'etl', data: {}, deps: ['a'] },
    { name: 'c', queueName: 'etl', data: {}, deps: ['b'] }, // a -> b -> c -> a = cycle!
  ], connection);
} catch (err) {
  console.log(`Cycle detected: ${(err as Error).message}`);
}

// --- Shutdown ---
await etlWorker.close();
console.log('\nDone.');
