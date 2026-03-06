import 'reflect-metadata';
import {
  Module,
  Injectable,
  Controller,
  Post,
  Get,
  Body,
  Param,
  NotFoundException,
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

// --- Processors ---

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

// --- Queue Events Listener ---

@QueueEventsListener('orders')
class OrderEventsListener extends QueueEventsHost {
  @OnQueueEvent('completed')
  onCompleted(args: { jobId: string; returnvalue: any }) {
    console.log(`[QueueEvents] Order job ${args.jobId} completed`);
  }

  @OnQueueEvent('progress')
  onProgress(args: { jobId: string; data: string }) {
    console.log(`[QueueEvents] Order job ${args.jobId} progress: ${args.data}%`);
  }

  @OnQueueEvent('stalled')
  onStalled(args: { jobId: string }) {
    console.log(`[QueueEvents] Order job ${args.jobId} stalled`);
  }
}

// --- Services ---

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
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    return { id: job.id, name: job.name, data: job.data, returnvalue: job.returnvalue };
  }

  async getStatus() {
    return this.queue.getJobCounts();
  }
}

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
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    return { id: job.id, name: job.name, data: job.data, returnvalue: job.returnvalue };
  }

  async getStatus() {
    return this.queue.getJobCounts();
  }
}

// --- Controllers ---

@Controller('emails')
class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  async send(@Body() dto: { to: string; subject: string; body: string }) {
    return this.emailService.send(dto.to, dto.subject, dto.body);
  }

  @Post('send-bulk')
  async sendBulk(@Body() dto: { emails: { to: string; subject: string; body: string }[] }) {
    return this.emailService.sendBulk(dto.emails);
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

// --- Feature Module: orders have their own module with queue + flow producer ---

@Module({
  imports: [
    GlideMQModule.registerQueue({ name: 'orders' }),
    GlideMQModule.registerFlowProducer({ name: 'order-flow' }),
  ],
  providers: [OrderProcessor, OrderService, OrderEventsListener],
  controllers: [OrderController],
})
class OrderModule {}

// --- App Module ---

@Module({
  imports: [
    GlideMQModule.forRoot({
      connection: { addresses: [{ host: 'localhost', port: 6379 }] },
      testing: process.env.TESTING === 'true',
    }),
    GlideMQModule.registerQueue({ name: 'emails' }),
    OrderModule,
  ],
  providers: [EmailProcessor, EmailService],
  controllers: [EmailController],
})
class AppModule {}

// --- Bootstrap ---

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  await app.listen(3000);

  console.log(`NestJS + glide-mq running at http://localhost:3000

Email endpoints:
  POST /emails/send       - { to, subject, body }
  POST /emails/send-bulk  - { emails: [{ to, subject, body }] }
  GET  /emails/status
  GET  /emails/:id

Order endpoints:
  POST /orders            - { orderId, items }
  POST /orders/flow       - { orderId, items, email }
  GET  /orders/status
  GET  /orders/:id`);
}

bootstrap().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
