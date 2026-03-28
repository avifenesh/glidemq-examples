# AI Streaming

Real-time token streaming with typed chunks, reasoning separation, and SSE patterns.

## Examples

| File | Description | Requires |
|------|-------------|----------|
| `streaming-sse.ts` | SSE pattern with typed chunks and reconnection via Last-Event-ID | TestQueue |
| `reasoning-stream.ts` | Separated reasoning vs. content chunks for thinking models | TestQueue |
| `token-streaming.ts` | Real-time token streaming with resume capability | Valkey + LLM |

## Run

```bash
npm install
npx tsx streaming-sse.ts         # no Valkey needed
npx tsx reasoning-stream.ts      # no Valkey needed
npx tsx token-streaming.ts       # needs Valkey + OPENROUTER_API_KEY
```
