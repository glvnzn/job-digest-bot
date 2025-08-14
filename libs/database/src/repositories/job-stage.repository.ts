import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobStage } from '../entities/job-stage.entity';

@Injectable()
export class JobStageRepository {
  constructor(
    @InjectRepository(JobStage)
    private readonly jobStageRepository: Repository<JobStage>
  ) {}

  async create(stageData: Partial<JobStage>): Promise<JobStage> {
    const stage = this.jobStageRepository.create(stageData);
    return this.jobStageRepository.save(stage);
  }

  async findById(id: number): Promise<JobStage | null> {
    return this.jobStageRepository.findOne({ where: { id } });
  }

  async findAll(): Promise<JobStage[]> {
    return this.jobStageRepository.find({
      order: { sortOrder: 'ASC' },
    });
  }

  async findSystemStages(): Promise<JobStage[]> {
    return this.jobStageRepository.find({
      where: { isSystem: true },
      order: { sortOrder: 'ASC' },
    });
  }

  async findByUserId(userId: number): Promise<JobStage[]> {
    return this.jobStageRepository.find({
      where: { userId },
      order: { sortOrder: 'ASC' },
    });
  }

  async findUserStagesWithSystem(userId: number): Promise<JobStage[]> {
    return this.jobStageRepository
      .createQueryBuilder('stage')
      .where('stage.isSystem = true OR stage.userId = :userId', { userId })
      .orderBy('stage.sortOrder', 'ASC')
      .getMany();
  }

  async findDefaultStage(): Promise<JobStage | null> {
    return this.jobStageRepository.findOne({
      where: { isDefault: true, isSystem: true },
    });
  }

  async update(id: number, updates: Partial<JobStage>): Promise<JobStage | null> {
    await this.jobStageRepository.update(id, updates);
    return this.findById(id);
  }

  async updateSortOrder(stageId: number, newOrder: number): Promise<void> {
    await this.jobStageRepository.update(stageId, { sortOrder: newOrder });
  }

  async delete(id: number): Promise<void> {
    await this.jobStageRepository.delete(id);
  }

  async reorderStages(stageOrders: Array<{ id: number; sortOrder: number }>): Promise<void> {
    const queryRunner = this.jobStageRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const { id, sortOrder } of stageOrders) {
        await queryRunner.manager.update(JobStage, id, { sortOrder });
      }
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async count(): Promise<number> {
    return this.jobStageRepository.count();
  }

  async countByUser(userId: number): Promise<number> {
    return this.jobStageRepository.count({
      where: { userId },
    });
  }
}