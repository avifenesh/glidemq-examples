import { Queue, Worker } from 'glide-mq';
import type { Job } from 'glide-mq';

// Per-key ordering guarantees that all jobs with the same ordering key
// are processed sequentially, even when jobs have different priorities
// and multiple workers are running with high concurrency.
//
// Requires: Valkey/Redis on localhost:6379

const connection = { addresses: [{ host: 'localhost', port: 6379 }] };

// --- 1. Create queue and add jobs with ordering keys + mixed priority ---

const queue = new Queue('ordering-demo', { connection });

type PaymentData = {
  accountId: string;
  seq: number;
  amount: number;
};

const ACCOUNTS = 5;
const JOBS_PER_ACCOUNT = 8;
const TOTAL = ACCOUNTS * JOBS_PER_ACCOUNT;

// Track per-account sequence for each job
const seqByAccount: Record<string, number> = {};
const jobs: { name: string; data: PaymentData; opts: any }[] = [];

for (let i = 0; i < TOTAL; i++) {
  const accountId = `acct-${i % ACCOUNTS}`;
  seqByAccount[accountId] = (seqByAccount[accountId] || 0) + 1;

  jobs.push({
    name: 'process-payment',
    data: { accountId, seq: seqByAccount[accountId], amount: 10 + Math.floor(Math.random() * 90) },
    opts: {
      ordering: { key: accountId },
      // Random priority 0-4: lower = higher priority.
      // Despite priority reordering, per-key ordering is preserved.
      priority: Math.floor(Math.random() * 5),
    },
  });
}

// addBulk sends all jobs atomically in a single pipeline
await queue.addBulk(jobs);
console.log(`Added ${TOTAL} jobs across ${ACCOUNTS} accounts with random priority`);

// --- 2. Worker processes jobs and verifies ordering ---

const seenByAccount = new Map<string, number>();
let violations = 0;
let processed = 0;

const done = new Promise<void>((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Timeout - not all jobs processed')), 15000);

  const worker = new Worker<PaymentData>(
    'ordering-demo',
    async (job: Job<PaymentData>) => {
      const { accountId, seq, amount } = job.data;
      const lastSeen = seenByAccount.get(accountId) || 0;

      // Verify: this job's seq should be exactly lastSeen + 1
      if (seq !== lastSeen + 1) {
        violations++;
        console.log(`  [VIOLATION] ${accountId}: expected seq ${lastSeen + 1}, got ${seq}`);
      }

      seenByAccount.set(accountId, Math.max(lastSeen, seq));
      processed++;

      // Log every 10th job
      if (processed % 10 === 0 || processed === TOTAL) {
        console.log(`  Processed ${processed}/${TOTAL} jobs`);
      }

      if (processed >= TOTAL) {
        clearTimeout(timeout);
        resolve();
      }

      return `${accountId}:${seq}:$${amount}`;
    },
    {
      connection,
      concurrency: 10, // High concurrency to stress-test ordering
      blockTimeout: 200,
      promotionInterval: 50,
    },
  );

  worker.on('error', () => {});
});

await done;

// --- 3. Results ---

console.log('\n--- Results ---');
console.log(`Total processed: ${processed}`);
console.log(`Ordering violations: ${violations}`);
console.log(violations === 0 ? '[PASS] Per-key ordering preserved under concurrency + priority' : '[FAIL] Ordering violations detected');

// --- 4. Cleanup ---

await queue.obliterate({ force: true });
await queue.close();
process.exit(violations === 0 ? 0 : 1);
