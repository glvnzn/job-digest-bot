import { DataSource } from 'typeorm';
import { JobStage } from '../entities/job-stage.entity';

export async function seedDefaultJobStages(dataSource: DataSource): Promise<void> {
  const jobStageRepository = dataSource.getRepository(JobStage);

  // Check if system stages already exist
  const existingSystemStages = await jobStageRepository.find({
    where: { isSystem: true },
  });

  if (existingSystemStages.length > 0) {
    console.log('Default job stages already exist, skipping seeding');
    return;
  }

  const defaultStages = [
    {
      name: 'Interested',
      color: '#3B82F6',
      sortOrder: 1,
      isDefault: true,
      isSystem: true,
    },
    {
      name: 'Applied',
      color: '#F59E0B',
      sortOrder: 2,
      isDefault: false,
      isSystem: true,
    },
    {
      name: 'Phone Screen',
      color: '#8B5CF6',
      sortOrder: 3,
      isDefault: false,
      isSystem: true,
    },
    {
      name: 'Technical Interview',
      color: '#06B6D4',
      sortOrder: 4,
      isDefault: false,
      isSystem: true,
    },
    {
      name: 'Final Round',
      color: '#10B981',
      sortOrder: 5,
      isDefault: false,
      isSystem: true,
    },
    {
      name: 'Offer Received',
      color: '#22C55E',
      sortOrder: 6,
      isDefault: false,
      isSystem: true,
    },
    {
      name: 'Accepted',
      color: '#16A34A',
      sortOrder: 7,
      isDefault: false,
      isSystem: true,
    },
    {
      name: 'Rejected',
      color: '#EF4444',
      sortOrder: 8,
      isDefault: false,
      isSystem: true,
    },
    {
      name: 'Not Interested',
      color: '#6B7280',
      sortOrder: 9,
      isDefault: false,
      isSystem: true,
    },
  ];

  const stages = defaultStages.map(stageData => {
    const stage = new JobStage();
    Object.assign(stage, stageData);
    return stage;
  });

  await jobStageRepository.save(stages);
  console.log(`Seeded ${stages.length} default job stages`);
}

export const DefaultJobStagesSeeder = {
  name: 'DefaultJobStagesSeeder',
  run: seedDefaultJobStages,
};