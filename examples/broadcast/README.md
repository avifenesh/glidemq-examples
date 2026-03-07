# Broadcast

Demonstrates the Broadcast (fan-out pub/sub) pattern in glide-mq, where every
published message is delivered to all subscribers independently.

## What it demonstrates

- **Fan-out delivery** -- a single `Broadcast` publisher sends events to
  multiple `BroadcastWorker` subscribers, each with its own consumer group
- **Subject-based routing** -- `publish(subject, data)` attaches a
  dot-separated subject (routing key) to each message
- **Subject filtering** -- the `subjects` option on `BroadcastWorker` filters
  messages so the processor only receives matching subjects; non-matching
  messages are auto-acknowledged and skipped
- **Independent processing** -- each subscriber processes messages at its own
  pace with its own concurrency setting
- **Graceful shutdown** -- all workers and the publisher close cleanly on
  SIGINT

## Subject Filtering

BroadcastWorker accepts a `subjects` option -- an array of patterns that
control which messages reach the processor. Messages whose subject does not
match any pattern are auto-acknowledged and never hit your callback.

### Pattern syntax

Subjects use dot-separated segments. Patterns support two wildcards:

| Token | Meaning | Example pattern | Matches |
|-------|---------|----------------|---------|
| `*` | Exactly one segment | `orders.*` | `orders.placed`, `orders.shipped` |
| `>` | One or more trailing segments (must be last) | `orders.>` | `orders.placed`, `orders.us.shipped` |
| literal | Exact segment match | `orders.placed` | `orders.placed` only |

### Examples

```typescript
// Only high-priority order events
subjects: ['orders.placed']

// All order events (one level deep)
subjects: ['orders.*']

// All order events (any depth)
subjects: ['orders.>']

// Multiple patterns -- match any
subjects: ['orders.placed', 'orders.cancelled']

// Mix wildcards and literals
subjects: ['orders.placed', 'shipments.>']
```

When `subjects` is omitted, all messages are delivered (no filtering).

## Run

```bash
npm install
npm start
```

Requires Valkey/Redis on localhost:6379.
