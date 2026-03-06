# Email Service

Simulates an email delivery service built on glide-mq, demonstrating
production-grade patterns for reliable message processing.

## What it demonstrates

- **Dead-letter queue (DLQ)** -- permanently failed emails are routed to a
  separate queue for inspection and manual retry
- **Retry with exponential backoff** -- transient failures are retried up to
  5 times with increasing delays
- **Job priority** -- transactional emails (password resets, receipts) are
  processed before marketing/newsletter emails
- **Rate limiting** -- worker throughput is capped at 10 emails per second
- **Progress tracking** -- each send reports progress as it moves through
  validation, rendering, and delivery stages
- **Real-time monitoring** -- `QueueEvents` logs deliveries and failures as
  they happen
- **Graceful shutdown** -- all workers, queues, and event listeners close
  cleanly on SIGINT

## Run

```bash
npm install
npm start
```

Requires Valkey/Redis on localhost:6379.
