# Subject-Based Filtering

Demonstrates NATS-style subject filtering on `BroadcastWorker` for topic-based message routing.

## What it shows

- **Subject publishing** - `broadcast.publish(subject, data)` with dot-separated topics
- **Wildcard patterns** - `*` (one segment) and `>` (trailing wildcard)
- **Multiple filter patterns** - `subjects: ['payments.failed', 'payments.refunded']`
- **Zero-waste filtering** - non-matching messages auto-ACKed without HGETALL
- **Catch-all subscriber** - no `subjects` option receives everything

## Setup

```bash
npm install
```

Requires Valkey/Redis on `localhost:6379`.

## Run

```bash
npm start
```

## Pattern syntax

| Token | Meaning | Example pattern | Matches | Doesn't match |
|-------|---------|----------------|---------|---------------|
| literal | exact segment | `orders.placed` | `orders.placed` | `orders.shipped` |
| `*` | one segment | `orders.*` | `orders.placed` | `orders.us.placed` |
| `>` | 1+ trailing | `orders.>` | `orders.placed`, `orders.us.east` | `payments.done` |

## Routing in this example

| Subscriber | Pattern | Receives |
|------------|---------|----------|
| logger | (none) | All 9 events |
| order-service | `orders.>` | orders.placed, orders.shipped |
| payment-alerts | `payments.failed`, `payments.refunded` | payments.failed, payments.refunded |
| us-inventory | `inventory.us.*` | inventory.us.east, inventory.us.west |

## Notes

- Filtering happens at stream entry parse time (before HGETALL)
- Non-matching messages are auto-acknowledged and skipped
- `subjects` is an array - message matches if ANY pattern matches
- `>` must be the last token in a pattern
- Omitting `subjects` delivers all messages (catch-all)
