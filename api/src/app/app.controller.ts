import { Controller, Get, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';
import { JobProcessorService } from '@job-digest-workspace/services';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly jobProcessor: JobProcessorService
  ) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get('health')
  healthCheck() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('test-db')
  async testDatabase() {
    return this.appService.testDatabase();
  }

  @Get('test-services')
  async testServices() {
    try {
      const result = await this.jobProcessor.testServices();
      return { 
        status: result ? 'success' : 'failure',
        message: result ? 'All services connected successfully' : 'Some services failed to connect'
      };
    } catch (error) {
      return { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  @Post('process')
  @HttpCode(HttpStatus.OK)
  async processJobs() {
    try {
      await this.jobProcessor.processJobAlerts();
      return { status: 'success', message: 'Job processing started' };
    } catch (error) {
      return { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  @Post('daily-summary')
  @HttpCode(HttpStatus.OK)
  async dailySummary() {
    try {
      await this.jobProcessor.sendDailySummary();
      return { status: 'success', message: 'Daily summary sent' };
    } catch (error) {
      return { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}
