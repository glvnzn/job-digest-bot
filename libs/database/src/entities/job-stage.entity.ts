import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, Index, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { UserJob } from './user-job.entity';

@Entity('job_stages')
@Index(['userId', 'sortOrder'])
@Index(['isSystem'])
export class JobStage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ length: 7 })
  color!: string; // hex color code

  @Column({ name: 'sort_order' })
  sortOrder!: number;

  @Column({ name: 'is_default', default: false })
  isDefault!: boolean;

  @Column({ name: 'is_system', default: false })
  isSystem!: boolean;

  @Column({ name: 'user_id', nullable: true })
  userId?: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @OneToMany(() => UserJob, userJob => userJob.stage)
  userJobs!: UserJob[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}