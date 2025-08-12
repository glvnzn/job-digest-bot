import { Pool } from 'pg';
import { JobListing, ResumeAnalysis, ProcessedEmail } from '../models/types';

export class DatabaseService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  }

  async init(): Promise<void> {
    try {
      await this.createTables();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    const createJobsTable = `
      CREATE TABLE IF NOT EXISTS jobs (
        id VARCHAR PRIMARY KEY,
        title VARCHAR NOT NULL,
        company VARCHAR NOT NULL,
        location VARCHAR,
        is_remote BOOLEAN DEFAULT FALSE,
        description TEXT,
        requirements TEXT[],
        apply_url VARCHAR NOT NULL,
        salary VARCHAR,
        posted_date TIMESTAMP,
        source VARCHAR NOT NULL,
        relevance_score FLOAT,
        email_message_id VARCHAR NOT NULL,
        processed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    const createResumeAnalysisTable = `
      CREATE TABLE IF NOT EXISTS resume_analysis (
        id SERIAL PRIMARY KEY,
        skills TEXT[],
        experience TEXT[],
        preferred_roles TEXT[],
        seniority VARCHAR,
        analyzed_at TIMESTAMP DEFAULT NOW()
      );
    `;

    const createProcessedEmailsTable = `
      CREATE TABLE IF NOT EXISTS processed_emails (
        message_id VARCHAR PRIMARY KEY,
        subject VARCHAR,
        from_email VARCHAR,
        processed_at TIMESTAMP DEFAULT NOW(),
        jobs_extracted INTEGER DEFAULT 0,
        deleted BOOLEAN DEFAULT FALSE
      );
    `;

    await this.pool.query(createJobsTable);
    await this.pool.query(createResumeAnalysisTable);
    await this.pool.query(createProcessedEmailsTable);
  }

  async saveJob(job: JobListing): Promise<void> {
    const query = `
      INSERT INTO jobs (id, title, company, location, is_remote, description, requirements, 
                       apply_url, salary, posted_date, source, relevance_score, 
                       email_message_id, processed, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO UPDATE SET
        relevance_score = EXCLUDED.relevance_score,
        processed = EXCLUDED.processed
    `;

    const values = [
      job.id, job.title, job.company, job.location, job.isRemote,
      job.description, job.requirements, job.applyUrl, job.salary,
      job.postedDate, job.source, job.relevanceScore, job.emailMessageId,
      job.processed, job.createdAt
    ];

    await this.pool.query(query, values);
  }

  async saveResumeAnalysis(analysis: ResumeAnalysis): Promise<void> {
    const query = `
      INSERT INTO resume_analysis (skills, experience, preferred_roles, seniority, analyzed_at)
      VALUES ($1, $2, $3, $4, $5)
    `;

    const values = [
      analysis.skills, analysis.experience, analysis.preferredRoles,
      analysis.seniority, analysis.analyzedAt
    ];

    await this.pool.query(query, values);
  }

  async saveProcessedEmail(email: ProcessedEmail): Promise<void> {
    const query = `
      INSERT INTO processed_emails (message_id, subject, from_email, processed_at, jobs_extracted, deleted)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (message_id) DO UPDATE SET
        deleted = EXCLUDED.deleted
    `;

    const values = [
      email.messageId, email.subject, email.from,
      email.processedAt, email.jobsExtracted, email.deleted
    ];

    await this.pool.query(query, values);
  }

  async getLatestResumeAnalysis(): Promise<ResumeAnalysis | null> {
    const query = `
      SELECT * FROM resume_analysis 
      ORDER BY analyzed_at DESC 
      LIMIT 1
    `;

    const result = await this.pool.query(query);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      skills: row.skills,
      experience: row.experience,
      preferredRoles: row.preferred_roles,
      seniority: row.seniority,
      analyzedAt: row.analyzed_at
    };
  }

  async isEmailProcessed(messageId: string): Promise<boolean> {
    const query = 'SELECT 1 FROM processed_emails WHERE message_id = $1';
    const result = await this.pool.query(query, [messageId]);
    return result.rows.length > 0;
  }

  async getRelevantJobs(minScore: number = 0.7): Promise<JobListing[]> {
    const query = `
      SELECT * FROM jobs 
      WHERE relevance_score >= $1 AND is_remote = TRUE AND processed = FALSE
      ORDER BY relevance_score DESC, created_at DESC
    `;

    const result = await this.pool.query(query, [minScore]);
    
    return result.rows.map(row => ({
      id: row.id,
      title: row.title,
      company: row.company,
      location: row.location,
      isRemote: row.is_remote,
      description: row.description,
      requirements: row.requirements,
      applyUrl: row.apply_url,
      salary: row.salary,
      postedDate: row.posted_date,
      source: row.source,
      relevanceScore: row.relevance_score,
      emailMessageId: row.email_message_id,
      processed: row.processed,
      createdAt: row.created_at
    }));
  }

  async markJobAsProcessed(jobId: string): Promise<void> {
    const query = 'UPDATE jobs SET processed = TRUE WHERE id = $1';
    await this.pool.query(query, [jobId]);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}