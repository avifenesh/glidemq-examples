import 'reflect-metadata';
import { Module, Injectable, Controller, Post, Get, Body } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { GlideMQModule, InjectQueue, Processor, WorkerHost, OnWorkerEvent } from '@glidemq/nestjs';
import type { Queue, Job } from 'glide-mq';

// --- Processor: handles jobs from the 'emails' queue ---

@Processor('emails')
class EmailProcessor extends WorkerHost {
  async process(job: Job) {
    console.log(`Sending email to ${job.data.to}: ${job.data.subject}`);
    // Simulate email sending
    await new Promise((r) => setTimeout(r, 200));
    return { sent: true, to: job.data.to };
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    console.log(`Email job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    console.error(`Email job ${job.id} failed:`, err.message);
  }
}

// --- Service: injects the queue to add jobs ---

@Injectable()
class EmailService {
  constructor(@InjectQueue('emails') private readonly queue: Queue) {}

  async sendEmail(to: string, subject: string, body: string) {
    const job = await this.queue.add('send', { to, subject, body });
    return { jobId: job?.id ?? null, status: 'queued' };
  }

  async getStatus() {
    return this.queue.getJobCounts();
  }
}

// --- Controller: REST API endpoints ---

@Controller('emails')
class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  async send(@Body() body: { to: string; subject: string; body: string }) {
    return this.emailService.sendEmail(body.to, body.subject, body.body);
  }

  @Get('status')
  async status() {
    return this.emailService.getStatus();
  }
}

// --- App Module ---

@Module({
  imports: [
    GlideMQModule.forRoot({
      connection: { addresses: [{ host: 'localhost', port: 6379 }] },
    }),
    GlideMQModule.registerQueue({ name: 'emails' }),
  ],
  controllers: [EmailController],
  providers: [EmailProcessor, EmailService],
})
class AppModule {}

// --- Bootstrap ---

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
  console.log('NestJS + glide-mq running at http://localhost:3000');
  console.log('POST /emails/send - { to, subject, body }');
  console.log('GET /emails/status');
}

bootstrap();
