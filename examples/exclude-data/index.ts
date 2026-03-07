import { Queue, Worker } from 'glide-mq';
import type { Job } from 'glide-mq';
import { setTimeout } from 'timers/promises';

const connection = { addresses: [{ host: 'localhost', port: 6379 }] };

// excludeData: true omits the payload (data + returnvalue) when listing jobs.
// Useful for status dashboards where payloads can be large (MB+).

const queue = new Queue('uploads', { connection });

const worker = new Worker('uploads', async (job: Job) => {
  console.log(`Processing upload: ${job.data.filename}`);
  await setTimeout(50);
  return { stored: true, url: `https://cdn.example.com/${job.data.filename}` };
}, { connection, concurrency: 3 });

worker.on('error', (err) => console.error('Worker error:', err));

// Add jobs with large-ish payloads
for (let i = 0; i < 10; i++) {
  await queue.add('process', {
    filename: `video-${i}.mp4`,
    metadata: { size: 1024 * 1024 * (i + 1), codec: 'h264' },
    // imagine this is a large binary blob in production
    preview: 'x'.repeat(1000),
  });
}
console.log('Added 10 upload jobs');

// Wait for processing
await setTimeout(800);

// --- 1. Status dashboard: list completed jobs WITHOUT payloads ---
// Only gets id, name, state, timestamps - much smaller response.
const lightweight = await queue.getJobs('completed', 0, 99, { excludeData: true });
console.log(`\nCompleted jobs (excludeData: true) - ${lightweight.length} jobs:`);
lightweight.forEach((j) => {
  // data is empty ({}) and returnvalue is undefined when excludeData is true
  console.log(`  ${j.id} | ${j.name} | data keys: ${Object.keys(j.data).length} | returnvalue: ${j.returnvalue}`);
});

// --- 2. Get full details for a single job by ID ---
if (lightweight.length > 0) {
  const jobId = lightweight[0].id;

  const fullJob = await queue.getJob(jobId);
  console.log(`\nFull job ${fullJob?.id}:`);
  console.log('  data.filename:', fullJob?.data?.filename);
  console.log('  returnvalue:', fullJob?.returnvalue);

  // --- 3. getJob with excludeData ---
  const lightJob = await queue.getJob(jobId, { excludeData: true });
  console.log(`\nSame job with excludeData: data keys=${Object.keys(lightJob?.data ?? {}).length}`);
}

// --- Shutdown ---
await worker.close();
await queue.close();
console.log('\nDone.');
