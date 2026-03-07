import { Queue, Worker } from 'glide-mq';
import type { Job, ConnectionOptions, IamCredentials } from 'glide-mq';
import { setTimeout } from 'timers/promises';

// --- AWS IAM Authentication for ElastiCache / MemoryDB ---
//
// glide-mq supports IAM auth natively via the valkey-glide client.
// The client generates SigV4 tokens automatically using the default
// AWS credentials chain (env vars, ~/.aws/credentials, EC2 instance role, etc.).
//
// TLS is REQUIRED for IAM auth - AWS enforces encrypted connections.
//
// To run this example, you need:
//   1. An ElastiCache or MemoryDB cluster with IAM auth enabled
//   2. AWS credentials configured (env vars, profile, or instance role)
//   3. An IAM user created in ElastiCache/MemoryDB with appropriate permissions

// --- 1. ElastiCache Serverless with IAM ---

const elasticacheConnection: ConnectionOptions = {
  addresses: [{ host: 'my-cache.serverless.use1.cache.amazonaws.com', port: 6379 }],
  useTLS: true, // Required for IAM auth
  credentials: {
    type: 'iam',
    serviceType: 'elasticache',
    region: 'us-east-1',
    userId: 'my-iam-user',               // IAM user created in ElastiCache
    clusterName: 'my-cache',             // ElastiCache cluster name
    refreshIntervalSeconds: 300,          // Token refresh interval (default: 300s)
  } satisfies IamCredentials,
};

// --- 2. MemoryDB with IAM ---

const memorydbConnection: ConnectionOptions = {
  addresses: [{ host: 'my-memorydb.abc123.memorydb.us-east-1.amazonaws.com', port: 6379 }],
  useTLS: true,
  credentials: {
    type: 'iam',
    serviceType: 'memorydb',
    region: 'us-east-1',
    userId: 'my-iam-user',
    clusterName: 'my-memorydb',
  },
};

// --- 3. ElastiCache cluster mode with IAM + read replicas ---

const clusterConnection: ConnectionOptions = {
  addresses: [
    { host: 'my-cluster.abc123.clustercfg.use1.cache.amazonaws.com', port: 6379 },
  ],
  useTLS: true,
  clusterMode: true,
  credentials: {
    type: 'iam',
    serviceType: 'elasticache',
    region: 'us-east-1',
    userId: 'my-iam-user',
    clusterName: 'my-cluster',
  },
  readFrom: 'preferReplica', // Route reads to replicas for lower latency
};

// --- Pick which connection to use ---
// For this demo, we default to the ElastiCache serverless connection.
// Change this to memorydbConnection or clusterConnection as needed.

const connection = elasticacheConnection;

// --- Queue + Worker (same API as always) ---
// IAM auth is transparent - once the connection is configured, everything
// works exactly the same as password auth or no auth.

const queue = new Queue('iam-demo', { connection });

const worker = new Worker('iam-demo', async (job: Job) => {
  console.log(`[worker] Processing ${job.name}: ${JSON.stringify(job.data)}`);
  await setTimeout(50);
  return { processed: true, region: (connection.credentials as IamCredentials).region };
}, { connection, concurrency: 2 });

worker.on('completed', (job, result) => {
  console.log(`[worker] Completed ${job.id}:`, result);
});
worker.on('error', (err) => console.error('[worker] Error:', err));

// --- Produce jobs ---

console.log('Adding 3 jobs via IAM-authenticated connection...\n');
await queue.add('compute', { value: 1 });
await queue.add('compute', { value: 2 });
await queue.add('compute', { value: 3 });

await setTimeout(1000);

const counts = await queue.getJobCounts();
console.log('\nJob counts:', counts);

// --- Shutdown ---
await worker.close();
await queue.close();
console.log('Done.');
