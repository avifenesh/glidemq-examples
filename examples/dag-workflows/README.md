# DAG Workflow Dependencies

Demonstrates `dag()` helper and `FlowProducer.addDAG()` for arbitrary dependency graphs with multi-parent fan-in, diamond patterns, and cycle detection.

## What it shows

- **Diamond dependency** - a node waits for two parents to complete before running
- **Fan-in merge** - multiple independent sources converge into a single merge step
- **Topological sort** - nodes submitted in correct dependency order automatically
- **Cycle detection** - invalid graphs are rejected before any jobs are created
- **getChildrenValues()** - parent nodes read results from all their dependencies

## Setup

```bash
npm install
```

Requires Valkey/Redis on `localhost:6379`.

## Run

```bash
npm start
```

## DAG vs FlowProducer trees

| Feature | `flow.add()` (tree) | `dag()` / `flow.addDAG()` |
|---------|---------------------|---------------------------|
| Shape | Parent-child tree | Arbitrary DAG |
| Parents per node | Exactly 1 | 0 to N |
| Fan-in | Not possible | Native via `deps` array |
| Diamond pattern | Not possible | Supported |
| Cycle detection | N/A (trees are acyclic) | Automatic (throws `CycleError`) |

## Notes

- `deps` lists the names of other nodes in the same DAG submission
- Nodes with no `deps` run immediately (leaves)
- A node only becomes runnable after ALL its deps complete
- The `dag()` helper creates a temporary FlowProducer internally
- For tree-shaped workflows, `flow.add()` is simpler and equally efficient
