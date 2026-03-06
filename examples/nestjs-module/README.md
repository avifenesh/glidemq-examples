# NestJS Module Example

Demonstrates using `@glidemq/nestjs` with NestJS decorators, dependency injection, and lifecycle management.

## What you'll learn

- `GlideMQModule.forRoot()` for global connection config
- `GlideMQModule.registerQueue()` for queue registration
- `@Processor` and `WorkerHost` for job processing
- `@InjectQueue` for queue injection into services
- `@OnWorkerEvent` for worker event handling

## Run

```bash
npm install
npm start
```

Requires Valkey/Redis on localhost:6379.

## Endpoints

- `POST /emails/send` - Queue an email job (`{ to, subject, body }`)
- `GET /emails/status` - Get queue job counts

## Docs

- [@glidemq/nestjs](https://github.com/avifenesh/glidemq-nestjs)
- [glide-mq Usage](https://github.com/avifenesh/glide-mq/blob/main/docs/USAGE.md)
