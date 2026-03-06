/**
 * email-service.ts
 *
 * A simple email service built on glide-mq.
 * This module is designed to be easily testable: the queue is injected,
 * and the processor function is exported separately so tests can wire
 * everything up with TestQueue/TestWorker instead of real infrastructure.
 */

// We type-alias the queue interface so this module works with both
// the real Queue and the in-memory TestQueue (they share the same API surface).
interface QueueLike {
  add(name: string, data: any, opts?: { priority?: number }): Promise<any>;
  getJobCounts(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }>;
}

export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
}

export interface EmailResult {
  delivered: boolean;
  to: string;
}

/**
 * Create an email service backed by a glide-mq queue.
 *
 * @param queue - A Queue or TestQueue instance to push jobs onto.
 */
export function createEmailService(queue: QueueLike) {
  return {
    /**
     * Enqueue an email for delivery.
     * Transactional emails (subject starting with "[transactional]") get
     * high priority (10); everything else is treated as marketing (priority 0).
     */
    async send(to: string, subject: string, body: string) {
      const isTransactional = subject.toLowerCase().startsWith('[transactional]');
      const priority = isTransactional ? 10 : 0;

      return queue.add('send-email', { to, subject, body } satisfies EmailJobData, {
        priority,
      });
    },

    /** Return current job counts from the queue. */
    async getStatus() {
      return queue.getJobCounts();
    },
  };
}

/**
 * Processor function for email jobs.
 *
 * In production this would call an SMTP gateway or third-party API.
 * Here it simply returns a delivery receipt. Export it separately so
 * tests can pass it directly to TestWorker.
 */
export async function emailProcessor(
  job: { data: EmailJobData },
): Promise<EmailResult> {
  return { delivered: true, to: job.data.to };
}
