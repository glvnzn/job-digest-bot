import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('job_locks')
@Index(['lockName'], { unique: true })
export class JobLock {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'lock_name', unique: true })
  lockName!: string;

  @Column({ name: 'lock_holder', nullable: true })
  lockHolder?: string;

  @CreateDateColumn({ name: 'acquired_at' })
  acquiredAt!: Date;

  @Column({ name: 'expires_at' })
  expiresAt!: Date;
}