# AI Search & Vectors

Job search, vector similarity, RAG pipelines, and embedding ingestion.

## Examples

| File | Description | Requires |
|------|-------------|----------|
| `search-dashboard.ts` | Job search API with monitoring and retry workflows | Valkey (search module) + LLM |
| `vector-search.ts` | KNN semantic search with TAG, NUMERIC, and VECTOR fields | Valkey (search module) |
| `rag-pipeline.ts` | RAG flow: embed, search, generate with streaming and budget | Valkey (search module) + LLM |
| `embedding-pipeline.ts` | Document ingestion with per-chunk usage and flow budget cap | Valkey + LLM |

## Run

Requires Valkey with the search module (valkey-bundle image).

```bash
npm install
npx tsx search-dashboard.ts      # needs Valkey + OPENROUTER_API_KEY
npx tsx vector-search.ts         # needs Valkey with search module
npx tsx rag-pipeline.ts          # needs Valkey + OPENROUTER_API_KEY
npx tsx embedding-pipeline.ts    # needs Valkey + OPENROUTER_API_KEY
```
