# NestJS Module Example

Comprehensive example of `@glidemq/nestjs` - demonstrates every major feature using an order processing + email notification scenario.

## What you'll learn

- `GlideMQModule.forRoot()` for global connection config with testing mode
- `GlideMQModule.registerQueue()` with `defaultJobOptions` (retries, backoff)
- `GlideMQModule.registerFlowProducer()` for workflow support
- `@Processor` with options object (concurrency) and `WorkerHost` base class
- `@OnWorkerEvent` for worker lifecycle events (active, completed, failed)
- `@InjectQueue` for queue injection into services
- `@InjectFlowProducer` for flow producer injection
- `@QueueEventsListener` + `QueueEventsHost` for queue-level event monitoring
- `@OnQueueEvent` for queue events (completed, progress, waiting)
- Feature module pattern (OrderModule with its own queue registration)
- Job progress tracking with `job.updateProgress()`
- Job logging with `job.log()`
- Parent/child flow workflows (order + confirmation email)
- Bulk job operations with `addBulk`
- Job retrieval by ID

## Architecture

```
AppModule
  ├── GlideMQModule.forRoot()         # Global connection config
  ├── GlideMQModule.registerQueue()   # 'emails' queue (root level)
  ├── EmailProcessor                  # @Processor with concurrency: 3
  ├── EmailService                    # @InjectQueue('emails')
  ├── EmailController                 # REST API for emails
  └── OrderModule                     # Feature module
       ├── GlideMQModule.registerQueue()        # 'orders' queue
       ├── GlideMQModule.registerFlowProducer() # 'order-flow'
       ├── OrderProcessor              # @Processor with progress tracking
       ├── OrderEventsListener         # @QueueEventsListener
       ├── OrderService                # @InjectQueue + @InjectFlowProducer
       └── OrderController             # REST API for orders
```

## Run

```bash
npm install
npm start
```

Requires Valkey/Redis on localhost:6379. To run without a server, set `TESTING=true`:

```bash
TESTING=true npm start
```

## Endpoints

**Emails:**

```bash
# Send a single email
curl -X POST http://localhost:3000/emails/send \
  -H 'Content-Type: application/json' \
  -d '{"to":"user@example.com","subject":"Hello","body":"Welcome!"}'

# Send multiple emails
curl -X POST http://localhost:3000/emails/send-bulk \
  -H 'Content-Type: application/json' \
  -d '{"emails":[{"to":"a@b.com","subject":"Hi","body":"1"},{"to":"c@d.com","subject":"Hi","body":"2"}]}'

# Queue status
curl http://localhost:3000/emails/status

# Get job by ID
curl http://localhost:3000/emails/<job-id>
```

**Orders:**

```bash
# Create an order
curl -X POST http://localhost:3000/orders \
  -H 'Content-Type: application/json' \
  -d '{"orderId":"ORD-001","items":["widget","gadget"]}'

# Create an order with confirmation email (parent/child flow)
curl -X POST http://localhost:3000/orders/flow \
  -H 'Content-Type: application/json' \
  -d '{"orderId":"ORD-002","items":["widget"],"email":"buyer@example.com"}'

# Queue status
curl http://localhost:3000/orders/status

# Get job by ID
curl http://localhost:3000/orders/<job-id>
```

## Docs

- [@glidemq/nestjs](https://github.com/avifenesh/glidemq-nestjs)
- [glide-mq Usage](https://github.com/avifenesh/glide-mq/blob/main/docs/USAGE.md)
