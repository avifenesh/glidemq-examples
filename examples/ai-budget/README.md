# AI Budget & Rate Limiting

Enforce token budgets and TPM rate limits on AI workloads.

## Examples

| File | Description | Requires |
|------|-------------|----------|
| `budget-weighted.ts` | Weighted token counting (reasoning 4x, cached 0.25x) with per-category caps | TestQueue |
| `agent-budget-loop.ts` | Autonomous agent that stops when weighted budget is exhausted | TestQueue |
| `batch-embed-tpm.ts` | 20 documents with TPM rate limiting and per-job cost tracking | TestQueue |
| `budget-cap.ts` | Flow-level budget enforcement preventing runaway AI agents | Valkey + LLM |
| `tpm-throttle.ts` | Token-per-minute rate limiting with throttle window behavior | Valkey + LLM |

## Run

```bash
npm install
npx tsx budget-weighted.ts       # no Valkey needed
npx tsx agent-budget-loop.ts     # no Valkey needed
npx tsx batch-embed-tpm.ts       # no Valkey needed
npx tsx budget-cap.ts            # needs Valkey + OPENROUTER_API_KEY
npx tsx tpm-throttle.ts          # needs Valkey + OPENROUTER_API_KEY
```
