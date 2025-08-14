import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOneOptions } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { googleId } });
  }

  async findByTelegramChatId(telegramChatId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { telegramChatId } });
  }

  async update(id: number, updates: Partial<User>): Promise<User | null> {
    await this.userRepository.update(id, updates);
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    await this.userRepository.delete(id);
  }

  async findWithUserJobs(id: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['userJobs', 'userJobs.job', 'userJobs.stage'],
    });
  }

  async updateSettings(id: number, settings: Record<string, any>): Promise<User | null> {
    await this.userRepository.update(id, { settings });
    return this.findById(id);
  }

  async linkTelegramAccount(userId: number, telegramChatId: string): Promise<User | null> {
    await this.userRepository.update(userId, { telegramChatId });
    return this.findById(userId);
  }

  async count(): Promise<number> {
    return this.userRepository.count();
  }
}