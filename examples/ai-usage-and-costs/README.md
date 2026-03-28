# AI Usage & Cost Tracking

Track tokens, costs, and models across jobs and flows.

## Examples

| File | Description | Requires |
|------|-------------|----------|
| `cost-breakdown.ts` | Per-category cost tracking with currency-agnostic costs | TestQueue |
| `multi-model-cost.ts` | Compare costs across 3 models with per-model breakdown | TestQueue |
| `usage-tracking.ts` | 3-step pipeline with per-job and flow-level usage aggregation | Valkey + LLM |
| `thinking-model.ts` | Reasoning token tracking for thinking models (o3-mini, etc.) | Valkey + LLM |

## Run

```bash
npm install
npx tsx cost-breakdown.ts        # no Valkey needed
npx tsx multi-model-cost.ts      # no Valkey needed
npx tsx usage-tracking.ts        # needs Valkey + OPENROUTER_API_KEY
npx tsx thinking-model.ts        # needs Valkey + OPENROUTER_API_KEY
```
