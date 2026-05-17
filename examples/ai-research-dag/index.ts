/**
 * AI Research Agent — DAG workflow
 *
 * Runs a five-stage research pipeline whose dependency graph is:
 *
 *                                   plan
 *                                /   |   \
 *                          search-web search-docs search-news
 *                                \   |   /
 *                                synthesize
 *                                    |
 *                                  review
 *
 * Stages:
 *   - plan         decomposes the user question into sub-queries
 *   - search-*     three parallel "searches" (web, internal docs, news feed)
 *   - synthesize   joins all three searches into a draft answer
 *   - review       final polish + integrity pass
 *
 * Why this shape:
 *   - The three searches run in parallel and ALL must finish before synthesize
 *     can start. That's the classic fan-out / fan-in that DAGs make ergonomic.
 *   - review wires straight on top of synthesize - a flat chain at the end so
 *     workers can see how a DAG composes with linear post-processing.
 *
 * The LLM calls are mocked (no API keys needed). Each stage reports token
 * usage with reportUsage() so the example demonstrates how glide-mq's
 * AI-native budget primitives compose with DAG flows: the FlowProducer.add()
 * budget caps the total spend across the entire graph.
 *
 * Run:
 *   docker run --rm -p 6379:6379 valkey/valkey:8.0   # or Redis
 *   npm install
 *   npm start
 */

import { FlowProducer, Queue, Worker } from 'glide-mq';
import type { Job, DAGNode, JobUsage } from 'glide-mq';
import { setTimeout as sleep } from 'timers/promises';

const connection = { addresses: [{ host: 'localhost', port: 6379 }] };
const QUEUE = 'research';

// ---------------------------------------------------------------------------
// Mocked LLM call.
// In production swap this for an SDK call (OpenAI, Anthropic, Bedrock, ...).
// We keep latency varied so the parallel fan-out is visible in the logs.
// ---------------------------------------------------------------------------
async function mockLLM(prompt: string, opts: { inputTokens: number; outputTokens: number; model: string }) {
  await sleep(120 + Math.floor(Math.random() * 200));
  const totalTokens = opts.inputTokens + opts.outputTokens;
  const usage: JobUsage = {
    tokens: { input: opts.inputTokens, output: opts.outputTokens },
    totalTokens,
    costs: { llm: totalTokens * 0.000002 }, // $2 per 1M tokens (mocked)
    totalCost: totalTokens * 0.000002,
    costUnit: 'USD',
  };
  return {
    text: `[${opts.model}] response to: ${prompt.slice(0, 70)}${prompt.length > 70 ? '…' : ''}`,
    usage,
  };
}

// ---------------------------------------------------------------------------
// Worker.
// One queue handles every stage; we dispatch on job.name. concurrency:4 lets
// the three parallel searches run together so the demo finishes quickly.
// ---------------------------------------------------------------------------
const worker = new Worker<{ question: string }, unknown>(
  QUEUE,
  async (job: Job) => {
    const question = job.data.question;
    console.log(`[worker] start "${job.name}"`);

    switch (job.name) {
      case 'plan': {
        const res = await mockLLM(`Break "${question}" into research sub-queries`, {
          model: 'planner', inputTokens: 120, outputTokens: 200,
        });
        await job.reportUsage(res.usage);
        return {
          subQueries: [
            `Background facts on: ${question}`,
            `Recent news on: ${question}`,
            `Citations for: ${question}`,
          ],
          plannerNote: res.text,
        };
      }

      case 'search-web':
      case 'search-docs':
      case 'search-news': {
        // Read plan's output via the BullMQ-flow children map.
        // search-* depends on plan, so plan was registered as a "child" of
        // search-* in BullMQ-flow terms. getChildrenValues() returns it.
        const upstream = await job.getChildrenValues();
        const plan = Object.values(upstream)[0] as { subQueries: string[] };
        const subQuery = plan?.subQueries?.[0] ?? question;

        const res = await mockLLM(`${job.name}: ${subQuery}`, {
          model: 'searcher', inputTokens: 200, outputTokens: 600,
        });
        await job.reportUsage(res.usage);
        return {
          source: job.name,
          findings: [
            `${job.name} finding #1 (${subQuery})`,
            `${job.name} finding #2`,
            `${job.name} finding #3`,
          ],
          note: res.text,
        };
      }

      case 'synthesize': {
        // Reads all three search-* outputs.
        const searches = await job.getChildrenValues() as Record<string, { source: string; findings: string[] }>;
        const sources = Object.values(searches);
        const allFindings = sources.flatMap((s) => s.findings);

        const res = await mockLLM(`Synthesize ${allFindings.length} findings about "${question}"`, {
          model: 'synthesizer', inputTokens: 1200, outputTokens: 800,
        });
        await job.reportUsage(res.usage);
        return {
          draft:
            `Draft answer for "${question}":\n` +
            sources.map((s) => `  • ${s.source}: ${s.findings.length} findings`).join('\n'),
          findingCount: allFindings.length,
          synthesisNote: res.text,
        };
      }

      case 'review': {
        const upstream = await job.getChildrenValues();
        const draft = Object.values(upstream)[0] as { draft: string; findingCount: number };

        const res = await mockLLM(`Review and polish: ${draft?.draft?.slice(0, 80)}`, {
          model: 'reviewer', inputTokens: 600, outputTokens: 300,
        });
        await job.reportUsage(res.usage);
        return {
          finalAnswer:
            (draft?.draft ?? 'no draft') +
            `\n\nReviewer notes: ${res.text}` +
            `\nSources cited: ${draft?.findingCount ?? 0}`,
        };
      }

      default:
        throw new Error(`Unknown stage: ${job.name}`);
    }
  },
  { connection, concurrency: 4 },
);

worker.on('completed', (job, result: any) => {
  const preview = JSON.stringify(result).slice(0, 80);
  console.log(`[worker] done  "${job.name}" -> ${preview}${JSON.stringify(result).length > 80 ? '…' : ''}`);
});
worker.on('error', (err) => console.error('[worker] error:', err));
await worker.waitUntilReady();

// ---------------------------------------------------------------------------
// Build & submit the DAG.
// ---------------------------------------------------------------------------
const question = 'How are LLM cost-tracking primitives typically modeled in message queues?';

const nodes: DAGNode[] = [
  { name: 'plan',         queueName: QUEUE, data: { question } },
  { name: 'search-web',   queueName: QUEUE, data: { question }, deps: ['plan'] },
  { name: 'search-docs',  queueName: QUEUE, data: { question }, deps: ['plan'] },
  { name: 'search-news',  queueName: QUEUE, data: { question }, deps: ['plan'] },
  { name: 'synthesize',   queueName: QUEUE, data: { question }, deps: ['search-web', 'search-docs', 'search-news'] },
  { name: 'review',       queueName: QUEUE, data: { question }, deps: ['synthesize'] },
];

console.log('Submitting DAG:');
console.log('  plan -> (search-web | search-docs | search-news) -> synthesize -> review\n');

const flow = new FlowProducer({ connection });
const jobs = await flow.addDAG({ nodes });

console.log(`Submitted ${jobs.size} jobs:`);
for (const [name, job] of jobs) console.log(`  ${name}: ${job.id}`);
console.log();

// ---------------------------------------------------------------------------
// Wait for the terminal node (review) to finish, then print the answer.
// In production you'd typically subscribe to events or poll via Queue.
// ---------------------------------------------------------------------------
const queue = new Queue<{ question: string }, { finalAnswer: string }>(QUEUE, { connection });
const reviewId = jobs.get('review')!.id;
const start = Date.now();
const deadline = start + 30_000;

let finalState = 'unknown';
while (Date.now() < deadline) {
  const refreshed = await queue.getJob(reviewId);
  finalState = (await refreshed?.getState()) ?? 'gone';
  if (finalState === 'completed' || finalState === 'failed') break;
  await sleep(150);
}

if (finalState !== 'completed') {
  throw new Error(`review job is ${finalState} after 30s - is Valkey/Redis on :6379 and the worker running?`);
}

const reviewJob = await queue.getJob(reviewId);
const finalResult = reviewJob?.returnvalue as { finalAnswer: string } | undefined;
console.log('\n=== Final answer ===');
console.log(finalResult?.finalAnswer ?? '(no return value)');
console.log(`\nWall clock: ${Date.now() - start}ms`);

// ---------------------------------------------------------------------------
// Aggregate per-stage usage. We walk the jobs map returned by addDAG and
// read each node's reportUsage() output directly. Queue.getFlowUsage walks
// one hop down the flow tree, which is enough for parent-child trees but
// not for a multi-level DAG; rolling our own here makes the totals match
// the actual graph.
// ---------------------------------------------------------------------------
console.log('\n=== Per-stage token usage ===');
let totalTokens = 0;
let totalCost = 0;
for (const [name, job] of jobs) {
  const refreshed = await queue.getJob(job.id);
  const u = refreshed?.usage;
  const tokens = u?.totalTokens ?? 0;
  const cost = u?.totalCost ?? 0;
  totalTokens += tokens;
  totalCost += cost;
  console.log(`  ${name.padEnd(14)} ${String(tokens).padStart(6)} tokens   $${cost.toFixed(6)}`);
}
console.log(`  ${'TOTAL'.padEnd(14)} ${String(totalTokens).padStart(6)} tokens   $${totalCost.toFixed(6)}`);

await worker.close();
await flow.close();
await queue.close();
console.log('\nDone.');
