# iam-auth

AWS IAM authentication for ElastiCache and MemoryDB with glide-mq.

## Prerequisites

1. An AWS ElastiCache or MemoryDB cluster with IAM authentication enabled
2. An IAM user created in the cluster (ElastiCache > User Management)
3. AWS credentials configured (environment variables, `~/.aws/credentials`, or EC2 instance role)

## Setup

```bash
npm install
```

## Run

```bash
# Set AWS credentials (if not using instance role)
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_REGION=us-east-1

npx tsx index.ts
```

## What it shows

| Concept | Description |
|---------|-------------|
| `type: 'iam'` | Enable IAM authentication (vs password auth) |
| `serviceType: 'elasticache'` | ElastiCache Serverless or standard |
| `serviceType: 'memorydb'` | MemoryDB for Redis |
| `useTLS: true` | Required for IAM - AWS enforces encrypted connections |
| `refreshIntervalSeconds` | How often to regenerate the SigV4 auth token (default: 300s) |
| `clusterMode: true` | IAM works with cluster mode and read replicas |

## Connection examples

### ElastiCache Serverless

```typescript
const connection = {
  addresses: [{ host: 'my-cache.serverless.use1.cache.amazonaws.com', port: 6379 }],
  useTLS: true,
  credentials: {
    type: 'iam' as const,
    serviceType: 'elasticache' as const,
    region: 'us-east-1',
    userId: 'my-iam-user',
    clusterName: 'my-cache',
  },
};
```

### MemoryDB

```typescript
const connection = {
  addresses: [{ host: 'my-db.abc123.memorydb.us-east-1.amazonaws.com', port: 6379 }],
  useTLS: true,
  credentials: {
    type: 'iam' as const,
    serviceType: 'memorydb' as const,
    region: 'us-east-1',
    userId: 'my-iam-user',
    clusterName: 'my-memorydb',
  },
};
```

## Notes

- glide-mq generates SigV4 tokens automatically using the default AWS credentials chain.
- No AWS SDK dependency needed in your app - token generation is handled by the valkey-glide native client.
- Tokens are refreshed in the background (default every 5 minutes).
- The queue/worker API is identical to password auth - only the connection config changes.
- `userId` is the IAM user ID created in ElastiCache/MemoryDB user management, not the AWS IAM user ARN.
