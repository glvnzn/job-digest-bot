import { Injectable } from '@nestjs/common';
import { JobStageRepository } from '@job-digest-workspace/database';

@Injectable()
export class AppService {
  constructor(private readonly jobStageRepository: JobStageRepository) {}

  getData(): { message: string } {
    return { message: 'Hello API' };
  }

  async testDatabase() {
    try {
      const jobStages = await this.jobStageRepository.findAll();
      return {
        success: true,
        message: 'Database connection successful',
        data: {
          jobStages: jobStages.length,
          stages: jobStages.map(stage => ({
            id: stage.id,
            name: stage.name,
            color: stage.color,
            isDefault: stage.isDefault,
            isSystem: stage.isSystem,
          })),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
