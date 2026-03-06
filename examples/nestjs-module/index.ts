import 'reflect-metadata';
import {
  Module,
  Injectable,
  Controller,
  Post,
  Get,
  Body,
  Param,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  GlideMQModule,
  InjectQueue,
  InjectFlowProducer,
  Processor,
  WorkerHost,
  OnWorkerEvent,
  QueueEventsListener,
  QueueEventsHost,
  OnQueueEvent,
} from '@glidemq/nestjs';
import type { Queue, FlowProducer, Job } from 'glide-mq';

// =============================================================================
// Processors
// =============================================================================

// --- Email Processor: concurrency option + worker events ---

@Processor({ name: 'emails', concurrency: 3 })
class EmailProcessor extends WorkerHost {
  async process(job: Job) {
    console.log(`[EmailProcessor] Sending to ${job.data.to}: ${job.data.subject}`);
    await new Promise((r) => setTimeout(r, 200));
    return { sent: true, to: job.data.to };
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    console.log(`[EmailProcessor] Job ${job.id} started`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    console.log(`[EmailProcessor] Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    console.error(`[EmailProcessor] Job ${job.id} failed:`, err.message);
  }
}

// --- Order Processor: progress tracking + job logging ---

@Processor('orders')
class OrderProcessor extends WorkerHost {
  async process(job: Job) {
    console.log(`[OrderProcessor] Processing order ${job.data.orderId}`);

    await job.updateProgress(10);
    await job.log('Validating order...');
    await new Promise((r) => setTimeout(r, 100));

    await job.updateProgress(50);
    await job.log('Charging payment...');
    await new Promise((r) => setTimeout(r, 100));

    await job.updateProgress(100);
    await job.log('Order complete');

    return { orderId: job.data.orderId, status: 'fulfilled' };
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    console.log(`[OrderProcessor] Order ${job.data.orderId} fulfilled`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    console.error(`[OrderProcessor] Order ${job.data.orderId} failed:`, err.message);
  }
}

// =============================================================================
// Queue Events Listener - monitors the orders queue at the queue level
// =============================================================================

@QueueEventsListener('orders')
class OrderEventsListener extends QueueEventsHost {
  @OnQueueEvent('completed')
  onCompleted(args: { jobId: string; returnvalue: any }) {
    console.log(`[QueueEvents] Order job ${args.jobId} completed`);
  }

  @OnQueueEvent('progress')
  onProgress(args: { jobId: string; data: number }) {
    console.log(`[QueueEvents] Order job ${args.jobId} progress: ${args.data}%`);
  }

  @OnQueueEvent('waiting')
  onWaiting(args: { jobId: string }) {
    console.log(`[QueueEvents] Order job ${args.jobId} waiting`);
  }
}

// =============================================================================
// Services
// =============================================================================

// --- Email Service: queue injection, bulk operations, job lookup ---

@Injectable()
class EmailService {
  constructor(@InjectQueue('emails') private readonly queue: Queue) {}

  async send(to: string, subject: string, body: string) {
    const job = await this.queue.add('send', { to, subject, body });
    return { jobId: job?.id ?? null, status: 'queued' };
  }

  async sendBulk(emails: { to: string; subject: string; body: string }[]) {
    const jobs = await this.queue.addBulk(
      emails.map((e) => ({ name: 'send', data: e })),
    );
    return jobs.map((j) => ({ jobId: j.id }));
  }

  async getJob(id: string) {
    const job = await this.queue.getJob(id);
    if (!job) return null;
    return { id: job.id, name: job.name, data: job.data, returnvalue: job.returnvalue };
  }

  async getStatus() {
    return this.queue.getJobCounts();
  }
}

// --- Order Service: queue injection + flow producer for parent/child workflows ---

@Injectable()
class OrderService {
  constructor(
    @InjectQueue('orders') private readonly queue: Queue,
    @InjectFlowProducer('order-flow') private readonly flow: FlowProducer,
  ) {}

  async createOrder(orderId: string, items: string[]) {
    const job = await this.queue.add('process', { orderId, items }, {
      priority: 1,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
    return { jobId: job?.id ?? null, status: 'queued' };
  }

  // Parent/child flow: processing the order is the parent,
  // sending a confirmation email is the child that must complete first.
  async createOrderWithConfirmation(orderId: string, items: string[], email: string) {
    const result = await this.flow.add({
      name: 'process',
      queueName: 'orders',
      data: { orderId, items },
      children: [
        {
          name: 'send',
          queueName: 'emails',
          data: { to: email, subject: `Order ${orderId} confirmed`, body: `Items: ${items.join(', ')}` },
        },
      ],
    });
    return { parentJobId: result.job?.id ?? null, status: 'flow-queued' };
  }

  async getJob(id: string) {
    const job = await this.queue.getJob(id);
    if (!job) return null;
    return { id: job.id, name: job.name, data: job.data, returnvalue: job.returnvalue };
  }

  async getStatus() {
    return this.queue.getJobCounts();
  }
}

// =============================================================================
// Controllers
// =============================================================================

@Controller('emails')
class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  async send(@Body() body: { to: string; subject: string; body: string }) {
    return this.emailService.send(body.to, body.subject, body.body);
  }

  @Post('send-bulk')
  async sendBulk(@Body() body: { emails: { to: string; subject: string; body: string }[] }) {
    return this.emailService.sendBulk(body.emails);
  }

  @Get('status')
  async status() {
    return this.emailService.getStatus();
  }

  @Get(':id')
  async getJob(@Param('id') id: string) {
    return this.emailService.getJob(id);
  }
}

@Controller('orders')
class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async create(@Body() body: { orderId: string; items: string[] }) {
    return this.orderService.createOrder(body.orderId, body.items);
  }

  @Post('flow')
  async createFlow(@Body() body: { orderId: string; items: string[]; email: string }) {
    return this.orderService.createOrderWithConfirmation(body.orderId, body.items, body.email);
  }

  @Get('status')
  async status() {
    return this.orderService.getStatus();
  }

  @Get(':id')
  async getJob(@Param('id') id: string) {
    return this.orderService.getJob(id);
  }
}

// =============================================================================
// Feature Module - orders have their own module with queue + flow producer
// =============================================================================

@Module({
  imports: [
    GlideMQModule.registerQueue({ name: 'orders' }),
    GlideMQModule.registerFlowProducer({ name: 'order-flow' }),
  ],
  providers: [OrderProcessor, OrderService, OrderEventsListener],
  controllers: [OrderController],
})
class OrderModule {}

// =============================================================================
// App Module - global config + email queue registered at the root level
// =============================================================================

@Module({
  imports: [
    GlideMQModule.forRoot({
      connection: { addresses: [{ host: 'localhost', port: 6379 }] },
      testing: process.env.TESTING === 'true',
    }),
    GlideMQModule.registerQueue({
      name: 'emails',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
      },
    }),
    OrderModule,
  ],
  providers: [EmailProcessor, EmailService],
  controllers: [EmailController],
})
class AppModule {}

// =============================================================================
// Bootstrap
// =============================================================================

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);

  console.log('NestJS + glide-mq running at http://localhost:3000');
  console.log('');
  console.log('Email endpoints:');
  console.log('  POST /emails/send       - { to, subject, body }');
  console.log('  POST /emails/send-bulk  - { emails: [{ to, subject, body }] }');
  console.log('  GET  /emails/status');
  console.log('  GET  /emails/:id');
  console.log('');
  console.log('Order endpoints:');
  console.log('  POST /orders            - { orderId, items }');
  console.log('  POST /orders/flow       - { orderId, items, email }');
  console.log('  GET  /orders/status');
  console.log('  GET  /orders/:id');
}

bootstrap();
