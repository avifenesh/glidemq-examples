# pluggable-serializers

Custom serializers for job data encoding in glide-mq.

## Setup

```bash
npm install
```

Requires a running Valkey/Redis instance on `localhost:6379`.

## Run

```bash
npx tsx index.ts
```

## What it shows

| Concept | Description |
|---------|-------------|
| Default JSON serializer | Built-in `JSON_SERIALIZER` used when no serializer is provided |
| Custom base64 serializer | Encodes payloads as base64 strings |
| Domain-specific serializer | Compact encoding for number arrays |
| Serializer contract | `serialize(data): string` + `deserialize(raw): unknown` |

## Notes

- The same `serializer` must be passed to both `Queue` and `Worker`.
- A mismatch sets `job.deserializationError = true` instead of throwing.
- `JSON_SERIALIZER` is the default - no config needed for standard JSON payloads.
- Both `serialize` and `deserialize` must be synchronous.
- Implement the `Serializer` interface to integrate any encoding (msgpack, protobuf, etc.).
