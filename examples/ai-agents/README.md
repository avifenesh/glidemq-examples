# AI Agents

Agent orchestration patterns - loops, memory, failover, human-in-the-loop, and full pipelines.

## Examples

| File | Description | Requires |
|------|-------------|----------|
| `fallback-usage.ts` | Cumulative usage tracking across fallback attempts | TestQueue |
| `ai-agent-loop.ts` | ReAct-style plan/execute/observe loop with suspend/resume and TPM | Valkey + LLM |
| `agent-memory.ts` | Multi-turn chatbot with persistent conversation history in Valkey | Valkey + LLM |
| `model-failover.ts` | Fallback chain with multiple model retries | Valkey + LLM |
| `human-approval.ts` | Suspend/signal workflow for human review of AI-generated content | Valkey + LLM |
| `content-pipeline.ts` | Full moderation pipeline with streaming, approval, fallbacks, budget | Valkey + LLM |
| `adaptive-timeout.ts` | Per-job lockDuration for mixed fast/slow AI workloads | Valkey + LLM |

## Run

```bash
npm install
npx tsx fallback-usage.ts        # no Valkey needed
npx tsx ai-agent-loop.ts         # needs Valkey + OPENROUTER_API_KEY
npx tsx agent-memory.ts          # needs Valkey + OPENROUTER_API_KEY
npx tsx model-failover.ts        # needs Valkey + OPENROUTER_API_KEY
npx tsx human-approval.ts        # needs Valkey + OPENROUTER_API_KEY
npx tsx content-pipeline.ts      # needs Valkey + OPENROUTER_API_KEY
npx tsx adaptive-timeout.ts      # needs Valkey + OPENROUTER_API_KEY
```
