# AI SDK Integrations

Integrate glide-mq with third-party AI SDKs for durable, observable LLM execution.

## Examples

| File | Description | Requires |
|------|-------------|----------|
| `with-langchain.ts` | LangChain chain pipeline with durable execution and usage reporting | Valkey + OPENAI_API_KEY |
| `with-vercel-ai-sdk.ts` | Vercel AI SDK with generateText and streamText usage tracking | Valkey + OPENROUTER_API_KEY |

## Run

```bash
npm install
npx tsx with-langchain.ts        # needs Valkey + OPENAI_API_KEY
npx tsx with-vercel-ai-sdk.ts    # needs Valkey + OPENROUTER_API_KEY
```
