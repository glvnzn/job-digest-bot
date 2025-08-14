import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { UserJob } from '../entities/user-job.entity';

export interface UserJobFilters {
  userId?: number;
  jobId?: number;
  stageId?: number;
  isInterested?: boolean;
  appliedDateFrom?: Date;
  appliedDateTo?: Date;
  hasNotes?: boolean;
}

@Injectable()
export class UserJobRepository {
  constructor(
    @InjectRepository(UserJob)
    private readonly userJobRepository: Repository<UserJob>
  ) {}

  async create(userJobData: Partial<UserJob>): Promise<UserJob> {
    const userJob = this.userJobRepository.create(userJobData);
    return this.userJobRepository.save(userJob);
  }

  async findById(id: number): Promise<UserJob | null> {
    return this.userJobRepository.findOne({
      where: { id },
      relations: ['user', 'job', 'stage'],
    });
  }

  async findByUserAndJob(userId: number, jobId: number): Promise<UserJob | null> {
    return this.userJobRepository.findOne({
      where: { userId, jobId },
      relations: ['user', 'job', 'stage'],
    });
  }

  async findByUserId(userId: number): Promise<UserJob[]> {
    return this.userJobRepository.find({
      where: { userId },
      relations: ['job', 'stage'],
      order: { updatedAt: 'DESC' },
    });
  }

  async findByJobId(jobId: number): Promise<UserJob[]> {
    return this.userJobRepository.find({
      where: { jobId },
      relations: ['user', 'stage'],
      order: { updatedAt: 'DESC' },
    });
  }

  async findByStageId(stageId: number): Promise<UserJob[]> {
    return this.userJobRepository.find({
      where: { stageId },
      relations: ['user', 'job'],
      order: { updatedAt: 'DESC' },
    });
  }

  async findWithFilters(filters: UserJobFilters = {}): Promise<UserJob[]> {
    const queryBuilder = this.userJobRepository
      .createQueryBuilder('userJob')
      .leftJoinAndSelect('userJob.user', 'user')
      .leftJoinAndSelect('userJob.job', 'job')
      .leftJoinAndSelect('userJob.stage', 'stage');

    if (filters.userId !== undefined) {
      queryBuilder.andWhere('userJob.userId = :userId', { userId: filters.userId });
    }

    if (filters.jobId !== undefined) {
      queryBuilder.andWhere('userJob.jobId = :jobId', { jobId: filters.jobId });
    }

    if (filters.stageId !== undefined) {
      queryBuilder.andWhere('userJob.stageId = :stageId', { stageId: filters.stageId });
    }

    if (filters.isInterested !== undefined) {
      queryBuilder.andWhere('userJob.isInterested = :isInterested', { 
        isInterested: filters.isInterested 
      });
    }

    if (filters.appliedDateFrom) {
      queryBuilder.andWhere('userJob.appliedDate >= :appliedDateFrom', { 
        appliedDateFrom: filters.appliedDateFrom 
      });
    }

    if (filters.appliedDateTo) {
      queryBuilder.andWhere('userJob.appliedDate <= :appliedDateTo', { 
        appliedDateTo: filters.appliedDateTo 
      });
    }

    if (filters.hasNotes !== undefined) {
      if (filters.hasNotes) {
        queryBuilder.andWhere('userJob.notes IS NOT NULL AND userJob.notes != \'\'');
      } else {
        queryBuilder.andWhere('(userJob.notes IS NULL OR userJob.notes = \'\')');
      }
    }

    return queryBuilder
      .orderBy('userJob.updatedAt', 'DESC')
      .getMany();
  }

  async findUserJobsByStage(userId: number): Promise<Record<string, UserJob[]>> {
    const userJobs = await this.userJobRepository.find({
      where: { userId },
      relations: ['job', 'stage'],
      order: { updatedAt: 'DESC' },
    });

    const jobsByStage: Record<string, UserJob[]> = {};

    for (const userJob of userJobs) {
      const stageName = userJob.stage.name;
      if (!jobsByStage[stageName]) {
        jobsByStage[stageName] = [];
      }
      jobsByStage[stageName].push(userJob);
    }

    return jobsByStage;
  }

  async update(id: number, updates: Partial<UserJob>): Promise<UserJob | null> {
    await this.userJobRepository.update(id, updates);
    return this.findById(id);
  }

  async moveToStage(userJobId: number, stageId: number): Promise<UserJob | null> {
    await this.userJobRepository.update(userJobId, { 
      stageId, 
      updatedAt: new Date() 
    });
    return this.findById(userJobId);
  }

  async markAsApplied(userJobId: number, appliedDate?: Date): Promise<UserJob | null> {
    const updateData: Partial<UserJob> = {
      appliedDate: appliedDate || new Date(),
      updatedAt: new Date(),
    };
    
    await this.userJobRepository.update(userJobId, updateData);
    return this.findById(userJobId);
  }

  async setInterested(userJobId: number, isInterested: boolean): Promise<UserJob | null> {
    await this.userJobRepository.update(userJobId, { 
      isInterested, 
      updatedAt: new Date() 
    });
    return this.findById(userJobId);
  }

  async addNotes(userJobId: number, notes: string): Promise<UserJob | null> {
    await this.userJobRepository.update(userJobId, { 
      notes, 
      updatedAt: new Date() 
    });
    return this.findById(userJobId);
  }

  async delete(id: number): Promise<void> {
    await this.userJobRepository.delete(id);
  }

  async deleteByUserAndJob(userId: number, jobId: number): Promise<void> {
    await this.userJobRepository.delete({ userId, jobId });
  }

  async count(filters: UserJobFilters = {}): Promise<number> {
    const queryBuilder = this.userJobRepository.createQueryBuilder('userJob');

    if (filters.userId !== undefined) {
      queryBuilder.andWhere('userJob.userId = :userId', { userId: filters.userId });
    }

    if (filters.stageId !== undefined) {
      queryBuilder.andWhere('userJob.stageId = :stageId', { stageId: filters.stageId });
    }

    if (filters.isInterested !== undefined) {
      queryBuilder.andWhere('userJob.isInterested = :isInterested', { 
        isInterested: filters.isInterested 
      });
    }

    return queryBuilder.getCount();
  }

  async getStageStats(userId: number): Promise<Array<{ stageName: string; count: number }>> {
    const result = await this.userJobRepository
      .createQueryBuilder('userJob')
      .leftJoin('userJob.stage', 'stage')
      .select('stage.name', 'stageName')
      .addSelect('COUNT(*)', 'count')
      .where('userJob.userId = :userId', { userId })
      .groupBy('stage.name')
      .getRawMany();

    return result.map(item => ({
      stageName: item.stageName,
      count: parseInt(item.count),
    }));
  }
}