# Testing with TestQueue / TestWorker

Demonstrates how to test glide-mq processors without running Valkey or Redis.

## How it works

`glide-mq/testing` exports **TestQueue** and **TestWorker** -- in-memory
replacements for the real `Queue` and `Worker` classes. They store jobs in
plain `Map`s and process them via microtasks, so your tests:

- Run instantly with zero infrastructure.
- Need no port allocation, Docker containers, or cleanup hooks.
- Can run in parallel without conflicts.

The pattern is simple: inject a `TestQueue` where your production code expects
a `Queue`, and wire a `TestWorker` with your processor function. Everything
else (job options, retries, progress tracking, bulk operations) works the same
as in production.

## Run

```bash
npm install
npm test
```

## Pattern: test the processor, not the transport

Your processor function is where business logic lives. By exporting it
separately (see `email-service.ts`), tests can pass it directly to
`TestWorker` and verify behaviour without touching the network layer.

```ts
import { TestQueue, TestWorker } from 'glide-mq/testing';
import { emailProcessor } from './email-service.js';

const queue = new TestQueue('email');
const worker = new TestWorker(queue, emailProcessor);

await queue.add('send-email', { to: 'test@example.com', subject: 'Hi', body: '...' });
// ... assert on job state, returnvalue, failedReason, counts, etc.
```

## NestJS testing

If you are using `@glidemq/nestjs`, the module has a built-in testing mode
that swaps real queues for `TestQueue` instances automatically. See the
`nestjs-module` example for details.
