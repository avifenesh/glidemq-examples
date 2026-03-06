# Core Workflows

Demonstrates glide-mq orchestration patterns:

- **FlowProducer** - parent-child job trees (e-commerce order flow)
- **chain()** - sequential pipeline (data processing)
- **group()** - parallel fan-out (notification broadcast)

## Run

```bash
npm install
npm start
```

Requires Valkey/Redis on localhost:6379.
