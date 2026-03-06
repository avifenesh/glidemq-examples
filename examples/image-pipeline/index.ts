import { Queue, FlowProducer, Worker, QueueEvents } from 'glide-mq';
import type { Job, FlowJob } from 'glide-mq';

const connection = {
  addresses: [{ host: 'localhost', port: 6379 }],
  clusterMode: false,
};

// --- Types ---

interface ImageJobData {
  step: 'validate' | 'resize' | 'optimize' | 'upload';
  imageId: string;
  filename: string;
  /** Target variant for resize/optimize/upload steps */
  variant?: string;
  /** Width in pixels for the target variant */
  width?: number;
  /** Quality percentage for optimization */
  quality?: number;
}

interface StepResult {
  step: string;
  imageId: string;
  variant?: string;
  url?: string;
  duration: number;
  metadata?: Record<string, unknown>;
}

// --- Simulated Processing ---

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function simulateValidation(job: Job<ImageJobData, StepResult>): Promise<StepResult> {
  const start = Date.now();

  await job.updateProgress({ step: 'validate', percent: 0 });
  await job.log(`Validating image: ${job.data.filename}`);

  // Simulate reading file headers and checking format
  await sleep(200);
  await job.updateProgress({ step: 'validate', percent: 50 });

  // Simulate dimension and file-size checks
  await sleep(150);
  await job.updateProgress({ step: 'validate', percent: 100 });
  await job.log('Validation passed: JPEG, 4032x3024, 8.2 MB');

  return {
    step: 'validate',
    imageId: job.data.imageId,
    duration: Date.now() - start,
    metadata: {
      format: 'jpeg',
      width: 4032,
      height: 3024,
      sizeBytes: 8_600_000,
    },
  };
}

async function simulateResize(job: Job<ImageJobData, StepResult>): Promise<StepResult> {
  const start = Date.now();
  const { variant, width } = job.data;

  await job.updateProgress({ step: 'resize', variant, percent: 0 });
  await job.log(`Resizing to ${variant} (${width}px wide)`);

  // Simulate progressive resize work
  for (let pct = 25; pct <= 100; pct += 25) {
    await sleep(300);
    await job.updateProgress({ step: 'resize', variant, percent: pct });
  }

  await job.log(`Resize complete: ${variant} -> ${width}x${Math.round(width! * 0.75)}px`);

  return {
    step: 'resize',
    imageId: job.data.imageId,
    variant,
    duration: Date.now() - start,
    metadata: { width, height: Math.round(width! * 0.75) },
  };
}

async function simulateOptimize(job: Job<ImageJobData, StepResult>): Promise<StepResult> {
  const start = Date.now();
  const { variant, quality } = job.data;

  await job.updateProgress({ step: 'optimize', variant, percent: 0 });
  await job.log(`Optimizing ${variant} at quality=${quality}%`);

  // Simulate compression passes
  await sleep(400);
  await job.updateProgress({ step: 'optimize', variant, percent: 50 });
  await sleep(350);
  await job.updateProgress({ step: 'optimize', variant, percent: 100 });

  const savedPct = 100 - quality!;
  await job.log(`Optimization complete: ~${savedPct}% size reduction`);

  return {
    step: 'optimize',
    imageId: job.data.imageId,
    variant,
    duration: Date.now() - start,
    metadata: { quality, compressionRatio: (100 - savedPct) / 100 },
  };
}

async function simulateUpload(job: Job<ImageJobData, StepResult>): Promise<StepResult> {
  const start = Date.now();
  const { variant, imageId } = job.data;

  await job.updateProgress({ step: 'upload', variant, percent: 0 });
  await job.log(`Uploading ${variant} to CDN`);

  // Simulate chunked upload
  for (let pct = 20; pct <= 100; pct += 20) {
    await sleep(200);
    await job.updateProgress({ step: 'upload', variant, percent: pct });
  }

  const url = `https://cdn.example.com/images/${imageId}/${variant}.jpg`;
  await job.log(`Upload complete: ${url}`);

  return {
    step: 'upload',
    imageId,
    variant,
    url,
    duration: Date.now() - start,
  };
}

// --- Worker ---

const worker = new Worker<ImageJobData, StepResult>(
  'image-processing',
  async (job: Job<ImageJobData, StepResult>) => {
    console.log(`[worker] Processing step="${job.data.step}" variant=${job.data.variant ?? 'n/a'} (job ${job.id})`);

    switch (job.data.step) {
      case 'validate':
        return simulateValidation(job);
      case 'resize':
        return simulateResize(job);
      case 'optimize':
        return simulateOptimize(job);
      case 'upload':
        return simulateUpload(job);
      default:
        throw new Error(`Unknown step: ${job.data.step}`);
    }
  },
  { connection, concurrency: 2 },
);

worker.on('completed', (job) => {
  console.log(`[worker] Completed job ${job.id} (step=${job.data.step}, variant=${job.data.variant ?? 'n/a'})`);
});

worker.on('failed', (job, err) => {
  console.error(`[worker] Failed job ${job.id}:`, err.message);
});

// --- QueueEvents for Pipeline Monitoring ---

const events = new QueueEvents('image-processing', { connection });

events.on('progress', ({ jobId, data }: { jobId: string; data: any }) => {
  const pct = data?.percent ?? 0;
  const step = data?.step ?? '?';
  const variant = data?.variant ? ` [${data.variant}]` : '';
  console.log(`[events] Job ${jobId} progress: ${step}${variant} ${pct}%`);
});

events.on('completed', ({ jobId }) => {
  console.log(`[events] Job ${jobId} completed`);
});

// --- Build & Submit the Pipeline ---

const QUEUE_NAME = 'image-processing';

const variants = [
  { name: 'thumbnail', width: 150, quality: 60 },
  { name: 'small', width: 480, quality: 75 },
  { name: 'medium', width: 1024, quality: 80 },
  { name: 'large', width: 1920, quality: 85 },
];

function buildPipeline(imageId: string, filename: string): FlowJob {
  // Each variant goes through: resize -> optimize -> upload
  // All variants depend on validation first.
  // Structure: parent "process-image" has children for each variant's upload,
  // which depend on optimize, which depends on resize, which depends on validate.
  //
  // FlowProducer processes children before parent, so the leaf nodes run first.

  const variantChildren: FlowJob[] = variants.map((v) => ({
    name: 'upload',
    queueName: QUEUE_NAME,
    data: {
      step: 'upload' as const,
      imageId,
      filename,
      variant: v.name,
    },
    children: [
      {
        name: 'optimize',
        queueName: QUEUE_NAME,
        data: {
          step: 'optimize' as const,
          imageId,
          filename,
          variant: v.name,
          quality: v.quality,
        },
        children: [
          {
            name: 'resize',
            queueName: QUEUE_NAME,
            data: {
              step: 'resize' as const,
              imageId,
              filename,
              variant: v.name,
              width: v.width,
            },
            children: [
              {
                name: 'validate',
                queueName: QUEUE_NAME,
                data: {
                  step: 'validate' as const,
                  imageId,
                  filename,
                },
              },
            ],
          },
        ],
      },
    ],
  }));

  return {
    name: 'process-image',
    queueName: QUEUE_NAME,
    data: { step: 'validate' as const, imageId, filename },
    children: variantChildren,
  };
}

// --- Main ---

const flowProducer = new FlowProducer({ connection });
const queue = new Queue(QUEUE_NAME, { connection });

const imageId = `img_${Date.now()}`;
const filename = 'photo-beach-sunset.jpg';

console.log(`Submitting image pipeline: ${filename} (${imageId})`);
console.log(`Variants: ${variants.map((v) => v.name).join(', ')}`);
console.log();

const tree = await flowProducer.add(buildPipeline(imageId, filename));

console.log(`Pipeline submitted. Parent job ID: ${tree.job.id}`);
console.log(`Child jobs: ${tree.children?.length ?? 0}`);
console.log();

// Wait for the parent job to complete, then collect children results
const parentState = await tree.job.waitUntilFinished(500, 120_000);
console.log();
console.log(`Parent job finished with state: ${parentState}`);

if (parentState === 'completed') {
  const childrenValues = await tree.job.getChildrenValues();
  console.log();
  console.log('--- Pipeline Results ---');

  const urls: Record<string, string> = {};
  for (const [key, result] of Object.entries(childrenValues)) {
    const r = result as StepResult;
    if (r.url) {
      urls[r.variant!] = r.url;
    }
  }

  if (Object.keys(urls).length > 0) {
    console.log('Generated URLs:');
    for (const [variant, url] of Object.entries(urls)) {
      console.log(`  ${variant}: ${url}`);
    }
  } else {
    console.log('Children values:', JSON.stringify(childrenValues, null, 2));
  }
}

// --- Graceful Shutdown ---

console.log();
console.log('Pipeline complete. Press Ctrl+C to exit.');

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await worker.close();
  await events.close();
  await flowProducer.close();
  await queue.close();
  process.exit(0);
});
