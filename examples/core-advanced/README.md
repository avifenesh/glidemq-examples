# Core Advanced

Demonstrates advanced glide-mq features:

- **Compression** - gzip for large payloads (98% reduction)
- **Rate limiting** - token-bucket throttling
- **Deduplication** - prevent duplicate job processing
- **Dead letter queue** - capture failed jobs for investigation
- **Schedulers** - cron-based repeatable jobs

## Run

```bash
npm install
npm start
```

Requires Valkey/Redis on localhost:6379.
