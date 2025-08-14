import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('resume_analysis')
export class ResumeAnalysis {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('json')
  skills!: string[];

  @Column('json')
  experience!: string[];

  @Column('json', { name: 'preferred_roles' })
  preferredRoles!: string[];

  @Column()
  seniority!: string;

  @CreateDateColumn({ name: 'analyzed_at' })
  analyzedAt!: Date;
}