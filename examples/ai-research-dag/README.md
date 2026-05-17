# AI Research Agent (DAG)

End-to-end example of orchestrating a multi-stage LLM research pipeline as a
DAG. Showcases the fan-out / fan-in pattern that DAG workflows enable, with
glide-mq's AI-native primitives (`reportUsage`, `getFlowUsage`) layered on top.

## Pipeline shape

```
                           plan
                        /   |   \
                  search-web search-docs search-news
                        \   |   /
                        synthesize
                            |
                          review
```

- **plan** — decomposes the user question into sub-queries
- **search-***  — three parallel searches, each consumes the plan output
- **synthesize** — joins all three search results into a draft answer
- **review** — final polish + integrity pass over the draft

The three searches run in parallel and `synthesize` must wait for ALL three to
complete. That fan-in is the part that's awkward with parent-child trees but
natural with DAGs.

## What it shows

- `flow.addDAG()` with non-trivial topology (fan-out + fan-in + linear tail)
- `job.getChildrenValues()` to read upstream stage outputs (in DAG terms,
  these are the node's `deps`)
- `job.reportUsage()` to report mocked LLM token counts and costs
- `queue.getFlowUsage()` to aggregate token and cost spend across the entire
  graph after completion

The LLM calls are mocked - no API keys required. Swap `mockLLM()` for a real
SDK call (OpenAI, Anthropic, Bedrock, …) in production.

## Setup

```bash
npm install
```

Requires:
- glide-mq **0.15.3 or later** (the corrected `DAGNode.deps` direction landed in 0.15.3)
- Valkey/Redis on `localhost:6379`. Quickest local instance:

```bash
docker run --rm -p 6379:6379 valkey/valkey:8.0
```

## Run

```bash
npm start
```

Expected output (abridged, the numbers will vary because of the latency jitter):

```
Submitting DAG:
  plan -> (search-web | search-docs | search-news) -> synthesize -> review

Submitted 6 jobs:
  plan: 1
  search-web: 2
  …

[worker] start "plan"
[worker] done  "plan" -> {"subQueries":[…
[worker] start "search-web"
[worker] start "search-docs"
[worker] start "search-news"
…

=== Final answer ===
Draft answer for "How are LLM cost-tracking primitives typically modeled in message queues?":
  • search-web: 3 findings
  • search-docs: 3 findings
  • search-news: 3 findings

Reviewer notes: [reviewer] response to: Review and polish:…
Sources cited: 9

Wall clock: 1218ms

=== Per-stage token usage ===
  review            900 tokens   $0.001800
  synthesize       2000 tokens   $0.004000
  search-web        800 tokens   $0.001600
  search-docs       800 tokens   $0.001600
  search-news       800 tokens   $0.001600
  plan              320 tokens   $0.000640
  TOTAL            5620 tokens   $0.011240
```

## Reading the code

The pipeline lives in a single worker that branches on `job.name`. Each branch:

1. Reads upstream stage outputs via `job.getChildrenValues()` — note that in
   DAG terms this returns the values of `deps`, not "children" in the
   user-facing tree sense. glide-mq maps DAG `deps` onto BullMQ-flow children
   under the hood (a node with `deps` is a `waiting-children` parent waiting
   for those deps to complete).
2. Makes a mocked LLM call.
3. Calls `job.reportUsage()` so `getFlowUsage()` can aggregate cost later.
4. Returns its output for downstream stages.

## Beyond this example

- **Real LLMs** - replace `mockLLM` with an SDK call (OpenAI, Anthropic,
  Bedrock, …) and feed `reportUsage` the SDK's response usage object;
  translate provider-specific keys to `tokens.{input,output}` and
  `costs.{your-bucket}`.
- **Cross-queue stages** - every `DAGNode` carries its own `queueName`, so a
  research stage and a critique stage can live on different queues with
  different worker pools (e.g. `gpu-workers` vs `cpu-workers`).
- **Budget caps** - the `ai-budget` example wires a cost cap onto a tree
  flow. DAG-wide budgets are a planned follow-up.
