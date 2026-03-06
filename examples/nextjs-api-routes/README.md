# Next.js API Routes (Producer + Separate Worker)

Demonstrates the recommended architecture for using glide-mq with Next.js on
Vercel or any serverless platform.

## Why a separate worker?

Serverless functions (Vercel, AWS Lambda, Cloudflare Workers) are short-lived.
They spin up, handle a request, and shut down. A glide-mq `Worker` needs to run
continuously to poll for and process jobs. If you start a Worker inside a
serverless function it will be killed mid-execution when the function times out.

The solution is to split your app into two parts:

| Component        | Role              | Where it runs                  |
| ---------------- | ----------------- | ------------------------------ |
| Next.js app      | **Producer only** | Vercel / serverless            |
| `worker.ts`      | **Consumer**      | Docker, PM2, Railway, Fly, etc |

Both connect to the same Valkey/Redis instance.

## Files

- **`api-routes.ts`** — Illustrative Next.js route handlers and a Server Action
  that add jobs to the queue. In a real app these would live under `app/api/...`.
  This file is **not** meant to be executed directly; it shows the pattern.
- **`worker.ts`** — Standalone worker process that consumes and processes jobs.
  Run this as a long-lived service.

## Run

1. Start Valkey (or Redis) on `localhost:6379`.
2. Install dependencies:

```bash
npm install
```

3. Start the worker in a terminal:

```bash
npm run start:worker
```

The worker will sit idle until jobs appear. In production your Next.js API
routes push jobs into the queue; for local testing you can add jobs manually
or adapt the code in `api-routes.ts` into a small script.

## Further reading

- [Next.js Discussion: Background Jobs](https://github.com/vercel/next.js/discussions/critical-background-tasks) —
  community discussion on patterns for long-running work in Next.js apps.
- [Vercel: How do I run background jobs?](https://vercel.com/guides/how-to-run-background-jobs) —
  Vercel's own guidance on offloading work to a separate process.
