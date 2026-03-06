# Image Processing Pipeline with Progress

Demonstrates an image processing pipeline using glide-mq's `FlowProducer` for
parent-child job dependencies with per-step progress tracking.

## What it demonstrates

- **FlowProducer** for atomic multi-step pipelines with parent/child dependencies
- **Pipeline stages**: validate -> resize -> optimize -> upload (per variant)
- **Multiple variants**: thumbnail, small, medium, large processed in parallel
- **Progress tracking** with `job.updateProgress({ step, variant, percent })`
- **Concurrency control**: `concurrency: 2` on the worker for CPU-heavy work
- **QueueEvents** for real-time pipeline monitoring
- **`getChildrenValues()`** to collect results from all child jobs
- **Graceful shutdown** of worker, events, flow producer, and queue

## Run

```bash
npm install
npm start
```

Requires Valkey/Redis on localhost:6379.
