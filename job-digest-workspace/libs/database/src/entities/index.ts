// Export all entities
export { User } from './user.entity';
export { Job } from './job.entity';
export { JobStage } from './job-stage.entity';
export { UserJob } from './user-job.entity';
export { ResumeAnalysis } from './resume-analysis.entity';
export { ProcessedEmail } from './processed-email.entity';
export { JobLock } from './job-lock.entity';

// Import entities for array export
import { User } from './user.entity';
import { Job } from './job.entity';
import { JobStage } from './job-stage.entity';
import { UserJob } from './user-job.entity';
import { ResumeAnalysis } from './resume-analysis.entity';
import { ProcessedEmail } from './processed-email.entity';
import { JobLock } from './job-lock.entity';

// Export as array for TypeORM configuration
export const entities = [
  User,
  Job,
  JobStage,
  UserJob,
  ResumeAnalysis,
  ProcessedEmail,
  JobLock,
];