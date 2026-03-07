# otel-tracing

OpenTelemetry tracing integration with glide-mq.

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
| `setTracer(tracer)` | Pass an OTel tracer to glide-mq |
| `isTracingEnabled()` | Check if tracing is active |
| `ConsoleSpanExporter` | View spans in the terminal |
| Span attributes | `glide-mq.queue`, `glide-mq.job.name`, `glide-mq.job.id` |

## Notes

- glide-mq auto-detects `@opentelemetry/api` if installed as a peer dependency.
- Use `setTracer(tracer)` to explicitly pass your own tracer instance.
- Each `queue.add` and worker job processing creates a span.
- Replace `ConsoleSpanExporter` with `OTLPTraceExporter` to send spans to Jaeger, Zipkin, or any OTLP backend.
- The `NodeTracerProvider` must be registered before creating Queue/Worker instances.
