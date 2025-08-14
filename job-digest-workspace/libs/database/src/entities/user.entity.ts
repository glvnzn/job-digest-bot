import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { UserJob } from './user-job.entity';

@Entity('users')
@Index(['email'], { unique: true })
@Index(['googleId'], { unique: true })
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  email!: string;

  @Column({ name: 'google_id', unique: true, nullable: true })
  googleId?: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl?: string;

  @Column({ name: 'telegram_chat_id', nullable: true })
  telegramChatId?: string;

  @Column('jsonb', { default: {} })
  settings!: Record<string, any>;

  @OneToMany(() => UserJob, userJob => userJob.user)
  userJobs!: UserJob[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}