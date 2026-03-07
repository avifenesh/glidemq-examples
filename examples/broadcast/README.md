# Broadcast (Pub/Sub Fan-Out)

Demonstrates `Broadcast` and `BroadcastWorker` for fan-out messaging where each message is delivered to multiple independent subscribers.

## What it shows

- **Broadcast publisher** - sends messages to all subscribers
- **BroadcastWorker subscribers** - each with its own consumer group, retries, and concurrency
- **Independent processing** - each subscriber processes every message independently
- **Late subscriber backfill** - `startFrom: '0-0'` replays all retained messages
- **Stream retention** - `maxMessages` limits how many messages are kept

## Setup

```bash
npm install
```

Requires Valkey/Redis on `localhost:6379`.

## Run

```bash
npm start
```

## Key concepts

| Concept | Queue (point-to-point) | Broadcast (fan-out) |
|---------|----------------------|---------------------|
| Delivery | One worker gets each job | ALL subscribers get each message |
| Consumer groups | Single shared group | One group per subscription |
| Retries | Shared retry budget | Per-subscription retry budget |
| Stream cleanup | XDEL after processing | Messages retained for all groups |

## Notes

- `subscription` is required on BroadcastWorker - it becomes the consumer group name
- Each subscriber processes messages independently with its own concurrency and backoff
- `maxMessages` uses exact XTRIM to enforce a hard retention limit
- `startFrom: '$'` (default) receives only new messages; `'0-0'` replays full history
