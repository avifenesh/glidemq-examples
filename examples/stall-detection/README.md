# Stall Detection Example

Demonstrates how glide-mq detects and recovers stalled (hung) jobs for both stream-sourced and list-sourced (LIFO/priority) workers.

## What is a stalled job?

A job is "stalled" when a worker picks it up but stops making progress - the process hangs, crashes, or is killed before completing the job. Without stall detection, these jobs would be stuck forever in an active state with no worker actually processing them.

## How it works

glide-mq uses two complementary mechanisms depending on how the job was sourced:

### Stream jobs (default FIFO)

Standard jobs enter a Redis Stream and are consumed via XREADGROUP with consumer groups. Each consumed entry stays in the Pending Entries List (PEL) until the worker ACKs it upon completion.

Stall detection uses **XAUTOCLAIM**: the scheduler periodically scans the PEL for entries that have been pending longer than `stalledInterval` without acknowledgment. These entries are reclaimed and re-queued for processing by a healthy worker.

This mechanism has been in glide-mq since the beginning.

### List jobs (LIFO / priority) - new in v0.11

Jobs added with `lifo: true` or with a `priority` value are popped from a Redis list, not consumed from a stream. Because they never enter the PEL, XAUTOCLAIM cannot see them.

**New in v0.11:** `glidemq_reclaimStalledListJobs` uses a bounded SCAN over active jobs to find list-sourced jobs whose `lastActive` heartbeat timestamp is older than `stalledInterval`. The same stall logic applies - increment `stalledCount`, emit a `stalled` event, and move to `failed` if `stalledCount` exceeds `maxStalledCount`.

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `stalledInterval` | 30000 | How often (ms) the scheduler checks for stalled jobs |
| `maxStalledCount` | 1 | How many stall cycles before a job is moved to failed |
| `lockDuration` | 30000 | Workers send a heartbeat every `lockDuration / 2` ms. Jobs with a recent heartbeat are not reclaimed |

## Event flow

1. Worker picks up a job and starts processing
2. Worker hangs or crashes - stops sending heartbeats
3. After `stalledInterval` ms, the scheduler detects the stale job
4. `stalledCount` is incremented and a `stalled` event is emitted
5. If `stalledCount > maxStalledCount`, the job moves to `failed` with reason `"job stalled more than maxStalledCount"`
6. Otherwise, the job is re-queued for another worker to pick up

## Running

Requires Valkey or Redis on `localhost:6379`.

```bash
npm install
npm start
```
