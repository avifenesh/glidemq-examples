# Webhook Delivery

Reliable webhook delivery system with automatic retries and failure handling.

## What it demonstrates

- Dead letter queue for permanently undeliverable webhooks
- Exponential backoff with jitter (8 attempts, 1s base delay, 500ms jitter)
- Per-endpoint rate limiting via ordering keys (5 deliveries per 10s per endpoint)
- Deduplication to prevent double-delivery of the same event (1-hour TTL)
- DLQ worker for logging/alerting on exhausted deliveries
- Real-time delivery tracking via `QueueEvents`
- Fan-out: each event dispatched to multiple registered endpoints
- Graceful shutdown

## Run

```bash
npm install
npm start
```

Requires Valkey/Redis on localhost:6379.
