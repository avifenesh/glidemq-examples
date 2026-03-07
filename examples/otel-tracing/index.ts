import { Queue, Worker, setTracer, isTracingEnabled } from 'glide-mq';
import type { Job } from 'glide-mq';
import { setTimeout } from 'timers/promises';

// OpenTelemetry SDK setup - must happen before glide-mq imports resolve the tracer.
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SimpleSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { Resource } from '@opentelemetry/resources';

// --- 1. Configure OTel SDK ---

const provider = new NodeTracerProvider({
  resource: new Resource({ 'service.name': 'glidemq-otel-example' }),
  // Use BatchSpanProcessor in production - SimpleSpanProcessor is for demo only
  spanProcessors: [new SimpleSpanProcessor(new ConsoleSpanExporter())],
});

provider.register();

// Pass the tracer to glide-mq so all queue/worker operations are traced.
// glide-mq also auto-detects @opentelemetry/api if installed as a peer dep.
const tracer = provider.getTracer('glidemq-example');
setTracer(tracer);

console.log('Tracing enabled:', isTracingEnabled());

// --- 2. Queue + Worker ---

const connection = { addresses: [{ host: 'localhost', port: 6379 }] };

const queue = new Queue('traced-jobs', { connection });
const worker = new Worker('traced-jobs', async (job: Job) => {
  console.log(`[worker] Processing ${job.name}: ${JSON.stringify(job.data)}`);
  await setTimeout(50); // simulate work
  return { processed: true, value: job.data.value * 2 };
}, { connection, concurrency: 2 });

worker.on('error', (err) => console.error('[worker] Error:', err));

// --- 3. Produce traced jobs ---

console.log('\nAdding 3 jobs (each queue.add creates a span)...\n');

await queue.add('double', { value: 10 });
await queue.add('double', { value: 20 });
await queue.add('double', { value: 30 });

// Wait for processing (each worker.process also creates a span)
await setTimeout(1000);

const counts = await queue.getJobCounts();
console.log('\nJob counts:', counts);

// --- Shutdown ---
await worker.close();
await queue.close();
await provider.shutdown();
console.log('Done. Check console output above for exported spans.');
