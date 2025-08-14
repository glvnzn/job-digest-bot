import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { Job, ResumeAnalysis, ProcessedEmail } from '@job-digest-workspace/database';
import { GmailService } from './gmail.service';
import { OpenAIService } from './openai.service';
import { TelegramService } from './telegram.service';
import { JobProcessorService } from './job-processor.service';
import { QueueService } from './queue.service';
import { JobQueueProcessor } from './job.processor';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Job, ResumeAnalysis, ProcessedEmail]),
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get('REDIS_URL');
        if (redisUrl) {
          return {
            redis: redisUrl,
          };
        } else {
          return {
            redis: {
              host: configService.get('REDIS_HOST') || 'localhost',
              port: configService.get('REDIS_PORT') || 6379,
              password: configService.get('REDIS_PASSWORD'),
            },
          };
        }
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'job-processing',
      defaultJobOptions: {
        removeOnComplete: 5,
        removeOnFail: 10,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
    ScheduleModule.forRoot(),
  ],
  providers: [
    GmailService,
    OpenAIService,
    TelegramService,
    JobProcessorService,
    QueueService,
    JobQueueProcessor,
    SchedulerService,
  ],
  exports: [
    GmailService,
    OpenAIService,
    TelegramService,
    JobProcessorService,
    QueueService,
    JobQueueProcessor,
    SchedulerService,
  ],
})
export class ServicesModule {}