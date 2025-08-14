import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('resume_analysis')
export class ResumeAnalysis {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('text')
  skills!: string;

  @Column('text')
  experience!: string;

  @Column('text')
  education!: string;

  @Column('text', { nullable: true })
  certifications?: string;

  @Column('text', { nullable: true })
  summary?: string;

  @CreateDateColumn({ name: 'analyzed_at' })
  analyzedAt!: Date;
}