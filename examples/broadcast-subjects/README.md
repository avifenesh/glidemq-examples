# Broadcast Subject-Based Filtering

Demonstrates how `BroadcastWorker` can filter messages by subject using glob
pattern matching, so each subscriber only processes the events it cares about.

## Prerequisites

- Node.js >= 20
- Valkey or Redis running on `localhost:6379`

## Run

```bash
npm install
npm start
```

## What it does

Creates a `Broadcast` publisher and three `BroadcastWorker` subscribers, each
with a different subject filter:

| Subscriber          | subjects option                              | Receives                                  |
| ------------------- | -------------------------------------------- | ----------------------------------------- |
| `orders-service`    | `['orders.*']`                               | orders.placed, orders.shipped, orders.delivered |
| `shipping-service`  | `['orders.shipped', 'orders.delivered']`      | orders.shipped, orders.delivered          |
| `analytics-service` | _(none - receives all)_                      | all four events                           |

Four messages are published: `orders.placed`, `orders.shipped`,
`orders.delivered`, and `payments.completed`. The output shows which subscriber
receives which message.

## Pattern syntax

Subjects are dot-separated strings (e.g. `orders.shipped`). Patterns support
two wildcards:

| Token | Meaning                                                     |
| ----- | ----------------------------------------------------------- |
| `*`   | Matches exactly one segment                                 |
| `>`   | Matches one or more trailing segments (must be last token)  |

Examples:

```
orders.*              -> matches orders.placed, orders.shipped
                         does NOT match orders.us.placed (two segments after orders)

orders.>              -> matches orders.placed, orders.us.east.placed
                         does NOT match orders (needs at least one trailing segment)

inventory.*.updated   -> matches inventory.us.updated, inventory.eu.updated
                         does NOT match inventory.us.east.updated
```

When multiple patterns are provided, a message matches if it matches **any**
pattern in the array.

## How it works internally

- `BroadcastWorker` compiles the `subjects` array into a matcher function at
  construction time via `compileSubjectMatcher`.
- On each stream read (XREADGROUP), the worker inspects the `name` field of
  the stream entry. If the name does not match any pattern, the entry is
  immediately auto-ACKed (XACK) and skipped - the processor is never called.
- This means zero wasted HGETALL calls for non-matching messages.
- Without the `subjects` option, all messages are delivered to the processor,
  preserving backward compatibility.

## Use cases

- **Microservice event routing** - each service subscribes to only the events
  it needs from a shared event bus.
- **Multi-tenant isolation** - use patterns like `tenant.123.*` to route events
  to the correct tenant handler.
- **Environment filtering** - patterns like `prod.>` vs `staging.>` on a shared
  stream.
