import { Queue, Worker, JSON_SERIALIZER } from 'glide-mq';
import type { Job, Serializer } from 'glide-mq';
import { setTimeout } from 'timers/promises';

const connection = { addresses: [{ host: 'localhost', port: 6379 }] };

// glide-mq supports pluggable serializers: any object with
//   serialize(data: unknown): string
//   deserialize(raw: string): unknown
// The SAME serializer must be used in both Queue and Worker.

// --- 1. Default (JSON) serializer - shown for comparison ---

const jsonQueue = new Queue('json-jobs', { connection });
const jsonWorker = new Worker('json-jobs', async (job: Job) => {
  return { echo: job.data, processed: true };
}, { connection, concurrency: 1 });

jsonWorker.on('error', (err) => console.error('[json] Worker error:', err));

// --- 2. Custom base64 serializer ---
// Useful for payloads that must survive environments that corrupt raw JSON
// (e.g. systems that escape quotes or truncate long strings).

const base64Serializer: Serializer = {
  serialize(data: unknown): string {
    return Buffer.from(JSON.stringify(data)).toString('base64');
  },
  deserialize(raw: string): unknown {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  },
};

const b64Queue = new Queue('b64-jobs', { connection, serializer: base64Serializer });
const b64Worker = new Worker('b64-jobs', async (job: Job) => {
  // job.data is already deserialized - no manual decoding needed
  return { received: job.data, encoding: 'base64' };
}, { connection, concurrency: 1, serializer: base64Serializer });

b64Worker.on('error', (err) => console.error('[b64] Worker error:', err));

// --- 3. Compact number-array serializer ---
// Demonstrates a domain-specific serializer for tight binary-like encoding.
// Encodes arrays of numbers as a comma-separated string to save space.

const numberArraySerializer: Serializer = {
  serialize(data: unknown): string {
    if (Array.isArray(data) && data.every((n) => typeof n === 'number')) {
      return (data as number[]).join(',');
    }
    // Fall back to JSON for non-number-array data
    return JSON.stringify(data);
  },
  deserialize(raw: string): unknown {
    if (/^-?\d/.test(raw) && !raw.startsWith('{') && !raw.startsWith('[')) {
      return raw.split(',').map(Number);
    }
    return JSON.parse(raw);
  },
};

const numQueue = new Queue('num-jobs', { connection, serializer: numberArraySerializer });
const numWorker = new Worker('num-jobs', async (job: Job) => {
  const nums = job.data as number[];
  const sum = nums.reduce((a, b) => a + b, 0);
  return { count: nums.length, sum, avg: sum / nums.length };
}, { connection, concurrency: 1, serializer: numberArraySerializer });

numWorker.on('error', (err) => console.error('[num] Worker error:', err));

// --- Enqueue jobs ---

const jsonJob = await jsonQueue.add('echo', { message: 'hello from JSON', nested: { ok: true } });
console.log('Added JSON job:', jsonJob?.id);

const b64Job = await b64Queue.add('encode', { secret: 'base64-encoded payload', value: 42 });
console.log('Added base64 job:', b64Job?.id);

const numJob = await numQueue.add('sum', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as unknown as Record<string, unknown>);
console.log('Added number-array job:', numJob?.id, '\n');

// Wait for processing
await setTimeout(500);

// Verify results
const [jsonDone, b64Done, numDone] = await Promise.all([
  jsonQueue.getJob(jsonJob?.id ?? ''),
  b64Queue.getJob(b64Job?.id ?? ''),
  numQueue.getJob(numJob?.id ?? ''),
]);

console.log('JSON result:', jsonDone?.returnvalue);
console.log('Base64 result:', b64Done?.returnvalue);
console.log('Number-array result:', numDone?.returnvalue);

// Serializer mismatch demo: reading a b64 job with the default serializer
// would produce garbled data - the serializer must match on both sides.
console.log('\n[NOTE] Serializer must match in Queue AND Worker. Mismatched serializers');
console.log('       set job.deserializationError=true instead of throwing.');

// Show that JSON_SERIALIZER is the same as the built-in default
const _check: Serializer = JSON_SERIALIZER;
void _check;

// --- Shutdown ---
await Promise.all([
  jsonWorker.close(),
  b64Worker.close(),
  numWorker.close(),
  jsonQueue.close(),
  b64Queue.close(),
  numQueue.close(),
]);
console.log('\nDone.');
process.exit(0);
