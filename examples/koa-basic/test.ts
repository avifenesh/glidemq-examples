import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import { TestQueue, TestWorker } from 'glide-mq/testing';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  PASS: ${msg}`);
    passed++;
  } else {
    console.log(`  FAIL: ${msg}`);
    failed++;
  }
}

async function main() {
  console.log('=== Koa + glide-mq Test ===\n');

  // Set up test queues (in-memory, no Valkey needed)
  const emailQueue = new TestQueue('emails');
  const orderQueue = new TestQueue('orders');
  const emailWorker = new TestWorker(emailQueue, async (job) => ({ sent: true, to: job.data.to }));

  // Build Koa app (same routes as index.ts but with test queues)
  const app = new Koa();
  const router = new Router();
  app.use(bodyParser());

  const queues: Record<string, TestQueue> = { emails: emailQueue, orders: orderQueue };

  router.post('/api/queues/:name/jobs', async (ctx) => {
    const queue = queues[ctx.params.name];
    if (!queue) { ctx.status = 404; ctx.body = { error: 'Queue not found' }; return; }
    const { name, data, opts } = ctx.request.body as any;
    if (!name || typeof name !== 'string') {
      ctx.status = 400; ctx.body = { error: 'Validation failed', details: ['name is required'] }; return;
    }
    const job = await queue.add(name, data ?? {}, opts);
    ctx.status = 201;
    ctx.body = { id: job?.id, name: job?.name, data: job?.data };
  });

  router.get('/api/queues/:name/counts', async (ctx) => {
    const queue = queues[ctx.params.name];
    if (!queue) { ctx.status = 404; ctx.body = { error: 'Queue not found' }; return; }
    ctx.body = await queue.getJobCounts();
  });

  router.get('/api/queues/:name/jobs', async (ctx) => {
    const queue = queues[ctx.params.name];
    if (!queue) { ctx.status = 404; ctx.body = { error: 'Queue not found' }; return; }
    const type = (ctx.query.type as string) ?? 'waiting';
    const jobs = await queue.getJobs(type as any);
    ctx.body = jobs.map((j) => ({ id: j.id, name: j.name, data: j.data }));
  });

  router.get('/api/queues/:name/jobs/:id', async (ctx) => {
    const queue = queues[ctx.params.name];
    if (!queue) { ctx.status = 404; ctx.body = { error: 'Queue not found' }; return; }
    const job = await queue.getJob(ctx.params.id);
    if (!job) { ctx.status = 404; ctx.body = { error: 'Job not found' }; return; }
    ctx.body = { id: job.id, name: job.name, data: job.data };
  });

  router.post('/api/queues/:name/pause', async (ctx) => {
    const queue = queues[ctx.params.name];
    if (!queue) { ctx.status = 404; ctx.body = { error: 'Queue not found' }; return; }
    await queue.pause();
    ctx.status = 204;
  });

  router.post('/api/queues/:name/resume', async (ctx) => {
    const queue = queues[ctx.params.name];
    if (!queue) { ctx.status = 404; ctx.body = { error: 'Queue not found' }; return; }
    await queue.resume();
    ctx.status = 204;
  });

  router.post('/send-email', async (ctx) => {
    const { to, subject, body } = ctx.request.body as any;
    const job = await emailQueue.add('send', { to, subject, body });
    ctx.body = { jobId: job?.id ?? null };
  });

  app.use(router.routes());
  app.use(router.allowedMethods());

  // Start server on random port
  const server = app.listen(0);
  const port = (server.address() as any).port;
  const base = `http://localhost:${port}`;

  try {
    // --- Add a job ---
    console.log('--- POST /api/queues/:name/jobs ---');
    const addRes = await fetch(`${base}/api/queues/emails/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'welcome', data: { to: 'user@test.com' } }),
    });
    assert(addRes.status === 201, `add job → 201 (got ${addRes.status})`);
    const addBody = await addRes.json() as any;
    assert(!!addBody.id, 'job has id');
    assert(addBody.name === 'welcome', 'job name matches');
    assert(addBody.data.to === 'user@test.com', 'job data matches');

    // --- Get counts ---
    console.log('\n--- GET /api/queues/:name/counts ---');
    const countsRes = await fetch(`${base}/api/queues/emails/counts`);
    assert(countsRes.status === 200, `counts → 200 (got ${countsRes.status})`);
    const counts = await countsRes.json() as any;
    assert(typeof counts.waiting === 'number', 'counts has waiting');

    // --- List jobs ---
    console.log('\n--- GET /api/queues/:name/jobs ---');
    const listRes = await fetch(`${base}/api/queues/emails/jobs?type=waiting`);
    assert(listRes.status === 200, `list jobs → 200 (got ${listRes.status})`);
    const jobs = await listRes.json() as any;
    assert(Array.isArray(jobs), 'jobs is array');

    // --- Get single job ---
    console.log('\n--- GET /api/queues/:name/jobs/:id ---');
    const getRes = await fetch(`${base}/api/queues/emails/jobs/${addBody.id}`);
    assert(getRes.status === 200, `get job → 200 (got ${getRes.status})`);
    const fetched = await getRes.json() as any;
    assert(fetched.id === addBody.id, 'fetched job id matches');

    // --- Missing job ---
    const missingRes = await fetch(`${base}/api/queues/emails/jobs/99999`);
    assert(missingRes.status === 404, `missing job → 404 (got ${missingRes.status})`);

    // --- Unknown queue ---
    console.log('\n--- Unknown queue ---');
    const unknownRes = await fetch(`${base}/api/queues/nope/counts`);
    assert(unknownRes.status === 404, `unknown queue → 404 (got ${unknownRes.status})`);

    // --- Pause / Resume ---
    console.log('\n--- POST /api/queues/:name/pause + resume ---');
    const pauseRes = await fetch(`${base}/api/queues/emails/pause`, { method: 'POST' });
    assert(pauseRes.status === 204, `pause → 204 (got ${pauseRes.status})`);
    const resumeRes = await fetch(`${base}/api/queues/emails/resume`, { method: 'POST' });
    assert(resumeRes.status === 204, `resume → 204 (got ${resumeRes.status})`);

    // --- Validation ---
    console.log('\n--- Validation ---');
    const badRes = await fetch(`${base}/api/queues/emails/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: {} }),
    });
    assert(badRes.status === 400, `missing name → 400 (got ${badRes.status})`);

    // --- Custom route ---
    console.log('\n--- POST /send-email ---');
    const emailRes = await fetch(`${base}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: 'hello@test.com', subject: 'Hi' }),
    });
    assert(emailRes.status === 200, `send-email → 200 (got ${emailRes.status})`);
    const emailBody = await emailRes.json() as any;
    assert(!!emailBody.jobId, 'send-email returns jobId');

  } finally {
    server.close();
    await emailQueue.close();
    await orderQueue.close();
    await emailWorker.close();
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
